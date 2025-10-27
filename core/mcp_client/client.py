"""MCP-WIP client logic"""

from typing import Dict, Any, List, Literal
import json
import logging
import functools
from fastmcp import Client
from fastmcp.client.client import CallToolResult
from fastmcp.client.transports import ClientTransport
from fastmcp.exceptions import ToolError
from mcp.types import TextResourceContents
from openai import AsyncOpenAI
from pydantic import ValidationError
from rag.base import BaseRAG
from .memory_handler import Memory, LastKMemory
from .models import ToolMessage, AssistantMessage, ValidResponse

# Example system prompt for the assistant
SYSTEM_PROMPT = (
    "You are a helpful assistant with access to tools and resources through the Model Context Protocol (MCP).\n\n"
    "Your task is to respond to user requests by analyzing both the **User** input and the **Available-widgets** section.\n\n"
    "The input format is as follows:\n\n"
    "User:\n<The user's query or instruction>\n\n"
    "Available-widgets:\n<An itemized list of widgets you can use, each described by a manifest and its purpose>\n\n"
    "Instructions:\n"
    "1. Carefully read the **User** section to understand what the user is asking for.\n"
    "2. Review the **Available-widgets** section to identify which widget best fits the user’s needs.\n"
    "3. If no widget is required, just fill the text field.\n"
    "4. If you select a widget, no other text is required.\n"
    "5. Select only one widget — the one most relevant to the current user request.\n"
    "6. Your response must include in a JSON formatted text: uri, parameters, text.\n"
    "Your response must be plain text with json formatting (with null values allowed)\n"
    "You can your tools to fetch the information required by the widgets or to help the user complete the requested tasks.\n"
    "Each time a user interacts with a widget, the context of the widget is given back to you. You can search the messagge history for relevant widget context.\n"
    "Notes: Do not generate extra widgets; do not output explanations; if you are unsure about some widget parameters do not guess and just leave them blank, just output the JSON directly."
)


class ChatExecption(Exception):
    """
    Exception class for chat message errors in MCPWIPClient.

    Raised for chat-related failures, malformations, or protocol errors.
    """


class MCPWIPClient:
    """
    Asynchronous client for interacting with an MCP-WIP server.

    Provides a high-level interface for:
      - Chat orchestration with history/memory management.
      - Dynamic RAG (Retrieval-Augmented Generation) widget selection/integration.
      - Calling server-side tools via the fastmcp API.
      - Context injection and prompt formatting for LLM flows.
      - Collecting and validating server resource templates and widgets.
    """

    def __init__(
        self,
        llm_client: AsyncOpenAI,
        mcp_server_transport: ClientTransport | Dict[str, Any],
        system_prompt: str = SYSTEM_PROMPT,
        model: str = "openai/gpt-oss-20b",
        rag: BaseRAG = None,
        memory: Memory = LastKMemory(k=5),
        log_lvl: Literal[0, 10, 20, 30, 40, 50] = logging.DEBUG,
    ):
        """
        Initialize the MCPWIPClient with an LLM client and MCP configuration.

        Args:
            llm_client: The language model client (OpenAI compatible, async).
            mcp_server_transport: Either a transport object or connection config dict for the MCP server.
            system_prompt: Default system prompt for new chat sessions.
            model: Model identifier for LLM completions (default: "openai/gpt-oss-20b").
            rag: Optional BaseRAG instance for RAG-based widget search. If None provided, all the widgets are exposed to the LLM each time.
            memory: Memory interface for contextual message/session management.
        """
        self.llm_client = llm_client
        self.mcp_config = mcp_server_transport
        self.mcp_client = Client(mcp_server_transport)
        self.system_prompt = system_prompt
        self.rag: BaseRAG = rag
        self.top_k = 5
        self.model = model
        self.memory = memory
        self.logger = logging.getLogger("MCPWIPClient")
        self.logger.setLevel(log_lvl)

    def set_llm_client(self, llm_client: AsyncOpenAI):
        """
        Set or update the language model client for this MCPWIPClient.

        Args:
            llm_client: The new LLM client to use.
        """
        self.llm_client = llm_client

    def set_mcp_config(self, mcp_config: dict):
        """
        Set or update the MCP server transport configuration and instantiate a Client.

        Args:
            mcp_config: New configuration dict for the MCP server.
        """
        self.mcp_config = mcp_config
        self.mcp_client = Client(mcp_config)

    def set_rag(self, rag: BaseRAG, top_k: int):
        """
        Set or update the RAG instance and the top-k parameter.

        Args:
            rag: New BaseRAG instance to use for widget retrieval.
            top_k: Maximum number of widgets to retrieve.
        """
        self.rag = rag
        self.top_k = top_k

    @staticmethod
    def run_with_self_client(func):
        """
        Decorator to ensure that the wrapped async method is called within an `async with self.mcp_client` context.

        Ensures MCP client connection lifecycle is handled for each decorated call.
        """

        @functools.wraps(func)
        async def wrapper(self, *args, **kwargs):
            async with self.mcp_client:
                return await func(self, *args, **kwargs)

        return wrapper

    async def call_mcp_tool(
        self, tool_name: str, arguments: Dict[str, Any]
    ) -> CallToolResult:
        """
        Call a server-side MCP tool asynchronously by name and arguments.

        Args:
            tool_name: String name of the tool to call.
            arguments: Dict of arguments for the tool.

        Returns:
            CallToolResult: The fastmcp response object.

        Raises:
            ToolError: If the tool call fails for any reason.
        """
        try:
            async with self.mcp_client:
                return await self.mcp_client.call_tool(tool_name, arguments)
        except ToolError as exc:
            self.logger.error("Tool call error %s", exc)
            raise ToolError from exc

    async def _list_openai_tools(self) -> List[Dict[str, Any]]:
        """
        List all available MCP tools as OpenAI-compatible function descriptors.

        Returns:
            List[Dict[str, Any]]: List of tool schemas suitable for OpenAI API `tools` parameter.
        """
        async with self.mcp_client:
            tools = await self.mcp_client.list_tools()
            return [
                {
                    "type": "function",
                    "function": {
                        "name": t.name,
                        "description": t.description or "",
                        "parameters": t.inputSchema,
                    },
                }
                for t in tools
            ]

    async def collect_widget_resources_text_full(self) -> List[str]:
        """
        Collect the full text content of all widget resources with URI scheme "wip".

        Returns:
            List[str]: List of widget resource JSON texts.
        """
        resources_text: List[str] = []
        async with self.mcp_client:
            res = await self.mcp_client.list_resources()
            for r in res:
                if r.uri.scheme == "wip":
                    rr: TextResourceContents = await self.mcp_client.read_resource(
                        r.uri
                    )
                    try:
                        resources_text.append(rr[0].text)
                    except Exception:
                        continue
        return resources_text

    async def collect_widget_resources_text(self, uris: List[str]) -> List[str]:
        """
        Given a list of resource URIs, fetch and return the widget texts.

        Args:
            uris: List of URIs pointing to widget resources.

        Returns:
            List[str]: List of resource JSON texts in order of input URIs.
        """
        async with self.mcp_client:
            resources_text: List[str] = []
            for uri in uris:
                rr: TextResourceContents = await self.mcp_client.read_resource(uri)
                try:
                    resources_text.append(rr[0].text)
                except Exception:
                    continue
            return resources_text

    async def format_prompt(self, user_message: str):
        """
        Prepares a prompt for the LLM chat turn, including best-matching widgets.

        Uses the RAG module (if available) to select top-k widget JSONs; else, returns all from the widget store.
        Formats as:
            User:
            <user_message>
            Available-widgets:
            <widget_json_1>
            <widget_json_2>
            ...

        Args:
            user_message: The most recent user input/message string.

        Returns:
            formatted_input: String containing the prompt for the LLM.
            uris: List of widget resource URIs included in this prompt.
        """
        if self.rag:
            best_widgets = self.rag.search(user_message, top_k=self.top_k)
        else:
            best_widgets = await self.collect_widget_resources_text_full()
        uris = []
        for widget in best_widgets:
            w_dict = json.loads(widget)
            uris.append(w_dict["uri"])

        formatted_input = (
            "User:\n"
            + user_message.strip()
            + "\n"
            + "Available-widgets:\n"
            + "\n".join(best_widgets)
            + "\n"
        )
        return formatted_input, uris

    @run_with_self_client
    async def run_chat_turn(
        self, user_message: str, session_id: str
    ) -> List[ToolMessage | AssistantMessage]:
        """
        Run an LLM chat turn, incorporating RAG widgets, tool-calling, and memory management.

        Args:
            user_message: User-provided message string for this turn.
            session_id: Unique identifier for the chat session (enables session memory/history).

        Returns:
            List[ToolMessage | AssistantMessage]: Messages to return for the UI, including tool and assistant results.

        Workflow:
            - Ensures a system prompt exists for this session.
            - Formats and injects widget context into the current prompt.
            - Uses OpenAI tool-calling to integrate MCP server tools as available.
            - Updates and appends session memory for RAG/widget and tool flows.
            - Ensures all returned assistant messages are valid according to the ValidResponse model.
        """
        messages = self.memory.get_context(session_id)
        if not any(m.get("role") == "system" for m in messages):
            self.memory.reinsert_system(
                session_id, {"role": "system", "content": self.system_prompt}
            )
            messages = self.memory.get_context(session_id)

        # print(messages)

        formatted_input, uris = await self.format_prompt(user_message)
        messages_to_return = []
        messages.append({"role": "user", "content": formatted_input})
        self.memory.add_message(
            session_id, {"role": "user", "content": formatted_input}
        )

        openai_tools = await self._list_openai_tools()
        tool_results: List[Dict[str, Any]] = []

        while True:
            response = await self.llm_client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=openai_tools if openai_tools else None,
                tool_choice="auto",
            )

            assistant_message = response.choices[0].message
            self.logger.debug(assistant_message)
            # print(assistant_message)

            if assistant_message.tool_calls:
                msg = {
                    "role": "assistant",
                    "content": assistant_message.content,
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in assistant_message.tool_calls
                    ],
                }
                messages.append(msg)
                self.memory.add_message(session_id, msg)

                for tool_call in assistant_message.tool_calls:
                    func_name = tool_call.function.name
                    try:
                        func_args = json.loads(tool_call.function.arguments or "{}")
                    except json.JSONDecodeError:
                        func_args = {}

                    result = await self.call_mcp_tool(func_name, func_args)

                    structured = (
                        result.structured_content
                        if isinstance(result, CallToolResult)
                        else result
                    )
                    tool_results.append(
                        {
                            "tool": func_name,
                            "arguments": func_args,
                            "result": structured,
                        }
                    )

                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": json.dumps(structured),
                        }
                    )
                    self.memory.add_message(
                        session_id,
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": json.dumps(structured),
                        },
                    )
                    messages_to_return.append(
                        ToolMessage(
                            role="tool",
                            tool=func_name,
                            arguments=func_args,
                            result=json.dumps(structured),
                        )
                    )

                continue

            final_text = assistant_message.content
            try:
                if isinstance(final_text, str):
                    parsed: dict = json.loads(final_text)
                else:
                    parsed: dict = final_text
                # If the parameters are a dict, remap them to a list of {"name": ..., "value": ...} objects
                if isinstance(parsed.get("parameters", []), dict):
                    parsed["parameters"] = [
                        {"name": k, "value": v} for k, v in parsed["parameters"].items()
                    ]
                if parsed.get("uri", "") not in uris:
                    parsed["uri"] = ""
                    parsed["parameters"] = []
                test = parsed.get("text", None)
                if test is None:
                    parsed["text"] = ""
                # print(parsed)
                final_text = json.dumps(parsed)
                ValidResponse.model_validate_json(final_text)
            except (json.JSONDecodeError, ValidationError) as e:
                # print("Fallback")
                # print(e)
                response_final = await self.llm_client.responses.parse(
                    model=self.model,
                    input=final_text,
                    instructions="""Return a valid response following your model. Do not infere anything that is not in the input, if some parameters are missing return only the ones you are certain.""",
                    text_format=ValidResponse,
                )
                parsed = response_final.output_parsed
                if parsed.uri not in uris:
                    parsed.uri = ""
                    parsed.parameters = []

                final_text = parsed.model_dump_json()

            messages.append({"role": "assistant", "content": final_text})
            self.memory.add_message(
                session_id, {"role": "assistant", "content": final_text}
            )
            messages_to_return.append(
                AssistantMessage(role="assistant", content=final_text)
            )

            return messages_to_return

    @run_with_self_client
    async def inject_context(self, context: str, session_id: str):
        """
        Inject additional contextual information into the chat as if provided by the user.

        Prepends '[Widget Context]: ' to the supplied context and stores it as a 'user' message.

        Args:
            context: Arbitrary contextual information (string) to provide for the session.
            session_id: ID of the conversation session where the context should be injected.
        """
        context = "[Widget Context]: " + context
        message = {"role": "user", "content": context}
        self.memory.add_message(session_id=session_id, message=message)
        self.logger.debug("[Additional context] %s", context)
        # print("[Additional context] %s", context)
        # print(f"{session_id}", self.memory.get_context(session_id))

    @run_with_self_client
    async def call_resource_template(self, uri: str):
        """
        Call and retrieve a specific resource template from the MCP server.

        Args:
            uri: Resource URI string corresponding to the template to fetch.

        Returns:
            The resource template contents as provided by the MCP client.

        Raises:
            Exception: If the resource cannot be fetched or an error occurs.
        """
        raise NotImplementedError()

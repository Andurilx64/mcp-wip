"""Router definition for easy FastAPI integration"""

import os
import uuid
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from core.mcp_client.client import MCPWIPClient
from core.mcp_client.models import AssistantMessage, ToolMessage
from .models import ChatRequest, ContextInjectionRequest


router = APIRouter()
_wip_client: MCPWIPClient = None

os.environ["TOKENIZERS_PARALLELISM"] = "false"


router = APIRouter()


class _Deps:
    def __init__(self):
        """
        Initializes the _Deps class, which holds dependencies for the router such as the MCPWIPClient instance.
        """
        self.client: MCPWIPClient | None = None


_deps = _Deps()


def set_client(service: MCPWIPClient):
    """
    Configure the MCPWIPClient instance to be used by the router.
    Must be called once before handling any requests to set the backend service client.

    Args:
        service (MCPWIPClient): An initialized MCPWIPClient instance.

    Example:
        set_client(MCPWIPClient(...))

    Raises:
        None
    """
    _deps.client = service


def get_client() -> MCPWIPClient:
    """
    Retrieve the configured MCPWIPClient instance.

    Returns:
        MCPWIPClient: The configured client instance to be used for backend service communication.

    Raises:
        RuntimeError: If the MCPWIPClient instance has not been set using set_client().
    """
    if _deps.client is None:
        raise RuntimeError("MCPWIPClient not configured. Call set_client() first.")
    return _deps.client


@router.get("/manifest")
async def get_full_manifest() -> Dict[str, Any]:
    """
    Retrieve the full manifest of widget resources.

    Returns:
        dict: A dictionary containing the widget resources.

    Raises:
        HTTPException: If an error occurs during the resource collection.
    """
    try:
        client = get_client()
        results = await client.collect_widget_resources_text_full()
        return {"resources": results}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/chat", response_model=List[ToolMessage | AssistantMessage])
async def chat(req: ChatRequest) -> List[ToolMessage | AssistantMessage]:
    """
    Handle a chat request by passing it to the MCPWIPClient and returning the response.

    Args:
        req (ChatRequest): The incoming chat request data.

    Returns:
        List[ToolMessage | AssistantMessage]: The resulting chat turn consisting of tool and assistant messages.

    Raises:
        HTTPException: If there is an error while processing the chat turn.
    """
    try:
        client = get_client()
        session_id = req.session_id
        result = await client.run_chat_turn(
            req.message,
            session_id=session_id,
        )
        # print(result)
        return result
    except Exception as exc:
        print(exc.with_traceback())
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/context-injection")
async def context_injection(req: ContextInjectionRequest) -> Dict[str, Any]:
    """
    Inject additional context for a given session.

    Args:
        req (ContextInjectionRequest): Contains the session_id and context content.

    Returns:
        dict: Status response upon success or failure.

    Raises:
        HTTPException: If context injection fails.
    """
    session_id = req.session_id
    if req.content:
        try:
            client = get_client()
            await client.inject_context(req.content, session_id)
        except Exception as exc:
            print(exc.with_traceback())
            raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"Status": "success"}


@router.get("/start-session")
async def get_session() -> Dict[str, str]:
    """
    Start a new session and return a unique session id.

    Returns:
        dict: Dictionary containing a unique session_id.
    """
    return {"session_id": uuid.uuid4().hex}


@router.get("/resource-template")
async def resource_template(uri: str) -> Any:
    """
    Endpoint to allow a resource template using the client, from the uri with path params.

    Args:
        uri (str): The URI identifying the resource template.

    Returns:
        Any: The resource template, if found.

    Raises:
        HTTPException: If resource retrieval fails.
    """
    try:
        client = get_client()
        result = await client.collect_widget_resources_text(uris=[uri])
        if result and len(result) > 0:
            return result[0]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/call-tool/{tool_name}")
async def call_tool(tool_name: str, arguments: dict) -> Any:
    """
    Calls a tool with the given tool_name and arguments using the MCP client.

    Args:
        tool_name (str): The name of the tool to be called.
        arguments (dict): The arguments to be passed to the tool.

    Returns:
        Any: The result of the tool call.

    Raises:
        HTTPException: If an error occurs while invoking the tool.
    """
    try:
        client = get_client()
        result = await client.call_mcp_tool(tool_name, arguments)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

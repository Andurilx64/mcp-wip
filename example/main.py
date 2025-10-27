"""
MCP-WIP Demo
=========================================================

This script demonstrates how to set up and launch an MCPWIPClient, which is built to run alongside the MCPWIPServer for serving widgets through
the Model Context Protocol (MCP).

Key features illustrated in this example:
- Configuration of MCP and widget directories for server initialization.
- Communication between MCPWIPClient and MCPWIPServer via the StdioTransport.
- Setup for automatic discovery and loading of widget manifests from a specified directory.
- Integration with external LLM API providers for chat completions (e.g., Groq).
- Defines a recommended system prompt to demonstrate the LLM widget selection and instantiation.
- Demonstrates usage of the wip routes in a FastAPI application.

"""

import os
import uvicorn
from fastmcp import Client
from fastmcp.client import StdioTransport
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from dotenv import load_dotenv

from core.mcp_client.client import MCPWIPClient
from rag.memvid_rag import MemvidRAG
from api.routes import router, set_client


load_dotenv()


# pick your transport - this example uses stdio
# So the MCPWIPClient runs the MCPWIPServer
transport = StdioTransport(
    "uv",
    args=[
        "run",
        "-m",
        "example.server",
        "--transport",
        "stdio",
        "--input-dir",
        "example/resources/widgets",
    ],
)

# FastMCP Client
client = Client(transport)

# Groq API for chat completions
# Export your GROQ_API_KEY as env variable
_llm_client = AsyncOpenAI(
    api_key=os.getenv("GROQ_API_KEY"), base_url="https://api.groq.com/openai/v1"
)


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


# Example function for MemvidRag initialization, retrives the wip resources from the server, launches the indexing and stores faiss index + video store
# For the demo, the index is already computed! Re-run for sync changes in the stored resources
async def init():
    """Example function for rag initialization"""
    clientx = MCPWIPClient(
        llm_client=AsyncOpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        ),
        mcp_server_transport=transport,
        system_prompt=SYSTEM_PROMPT,
        rag=None,
    )

    resources = await clientx.collect_widget_resources_text_full()
    rag = MemvidRAG(
        retriever_path="example/resources/store/memvid.mp4",
        index_path="example/resources/indexes/memvid.json",
    )
    rag.create_rag(resources)


if __name__ == "__main__":
    # if you want to update the RAG index run the following lines. It is recommended to restart the Client after; just re-run the program without the init()
    # asyncio.run(init())
    # return

    # memvid retriver on the pre-computed index
    rag = MemvidRAG(
        retriever_path="example/resources/store/memvid.mp4",
        index_path="example/resources/indexes/memvid.json",
    )

    # MCPWIPClient instance
    wip_client = MCPWIPClient(
        llm_client=AsyncOpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        ),
        mcp_server_transport=transport,
        system_prompt=SYSTEM_PROMPT,
        rag=rag,
    )

    # Instantiate the main FastAPI application
    app = FastAPI()

    app.add_middleware(  # this is not safe in production! Dev only
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Set the MCPWIPClient instance for the app
    set_client(wip_client)

    # Include the wip router in your fastapi app
    app.include_router(router, prefix="/wip")

    # Run the server
    uvicorn.run(app, host="0.0.0.0", port=9000, reload=False)

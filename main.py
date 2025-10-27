import asyncio
from fastmcp import Client, FastMCP, resources
from fastapi.middleware.cors import CORSMiddleware
from fastmcp.client import StdioTransport
from core.mcp_server.server import MCPWIPServer
from core.mcp_client.client import MCPWIPClient
import os
from openai import AsyncOpenAI
from rag.memvid_rag import MemvidRAG
from dotenv import load_dotenv
from fastapi import FastAPI
from api.routes import router, set_client
import uvicorn

load_dotenv()


transport = StdioTransport(
    "uv",
    args=[
        "run",
        "-m",
        "core.mcp_server.server",
        "--transport",
        "stdio",
        "--input-dir",
        "resources/widgets",
    ],
)

client = Client(transport)
_llm_client = AsyncOpenAI(
    api_key=os.getenv("GROQ_API_KEY"), base_url="https://api.groq.com/openai/v1"
)


# System prompt for the assistant
SYSTEM_PROMPT = (
    "You are a helpful assistant with access to tools and resources through the Model Context Protocol (MCP).\n\n"
    "Your task is to respond to user requests by analyzing both the **User** input and the **Available-widgets** section.\n\n"
    "The input format is as follows:\n\n"
    "User:\n<The user's query or instruction>\n\n"
    "Available-widgets:\n<An itemized list of widgets you can use, each described by a manifest and its purpose>\n\n"
    "Instructions:\n"
    "1. Carefully read the **User** section to understand what the user is asking for.\n"
    "2. Review the **Available-widgets** section to identify which widget best fits the user’s needs.\n"
    "3. If no widget is required, just fill the text field, leaving the others json fields null.\n"
    "4. If you select a widget, no other text is required.\n"
    "5. Select only one widget — the one most relevant to the current user request.\n"
    "6. Your response must include in a JSON formatted text: uri, parameters (as a list of objects with a name field and a value), text.\n"
    "you have access to a variety of tools that you can use to fill widget parameters or as standalone helping functions.\n"
    "Your response must be plain text with json formatting (with null values allowed)\n"
    "Notes: Do not generate extra widgets; do not output explanations; just output the JSON directly.\n"
    "Here it is an example response format: \n"
    '{"uri":"wip://widget-id","parameters":[{"name":"param1","value":"2025-10-18"}, {"name":"param2","value":"sku1234"}],"text":""}'
)


"""_mcp_config = {"mcpServers": {"demo": {"url": "http://localhost:8000/mcp"}}}
client = Client(_mcp_config)

server = MCPWIPServer(input_dir="resources/widgets", server=FastMCP(name="demo"))


@server.server.tool()
def sum(a, b):
    return a + b


@server.server.resource(uri="ux://ciao")
def get_r():
    return "ciao cioacio "


server.run_as_server("127.0.0.1", 8000)"""


async def test():
    async with client:
        res = await client.list_resources()
        print(res)
        resources_text = []
        for r in res:
            rr = await client.read_resource(r.uri)
            resources_text.append(rr[0].text)

        rag = MemvidRAG()
        # rag.create_rag(resources_text)
        clientx = MCPWIPClient(
            llm_client=AsyncOpenAI(
                api_key=os.getenv("GROQ_API_KEY"),
                base_url="https://api.groq.com/openai/v1",
            ),
            mcp_server_transport=transport,
            system_prompt=SYSTEM_PROMPT,
            rag=rag,
        )
        text = await clientx.format_prompt("Ciao")

        print(text)


async def init():
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
    rag = MemvidRAG()
    rag.create_rag(resources)


if __name__ == "__main__":
    # asyncio.run(init())
    rag = MemvidRAG()
    # rag.create_rag(resources_text)
    clientx = MCPWIPClient(
        llm_client=AsyncOpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        ),
        mcp_server_transport=transport,
        system_prompt=SYSTEM_PROMPT,
        rag=None,
    )
    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, specify your frontend domain
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    set_client(clientx)
    app.include_router(router, prefix="/wip")
    uvicorn.run(app, host="0.0.0.0", port=9000, reload=False)


# widget immagini con codice immagine -- done
# widget disponibilità stock -- done
# widget mini calendar con prenotazione -- done
# widget scansione qr code -- done

# tool prenotazione calendario
# tool interogazione calendario
# disponibilità stock -- done

# elicitation

# menu cerca stock

# framing (full screen e compatto e iconizzato)
# menù per aprire in maniera statica

"""
https://www.freepik.com/free-ai-image/elegant-leather-penny-loafers-wooden-cube_421082106.htm#fromView=search&page=1&position=0&uuid=f78f28df-9f09-487c-90f7-1172fcc92d12&query=shoes
https://www.freepik.com/free-ai-image/close-up-futuristic-sneakers_94954559.htm#fromView=search&page=1&position=2&uuid=f78f28df-9f09-487c-90f7-1172fcc92d12&query=shoes
https://www.freepik.com/free-ai-image/close-up-futuristic-sneakers_94954541.htm#fromView=search&page=1&position=28&uuid=f78f28df-9f09-487c-90f7-1172fcc92d12&query=shoes
https://www.freepik.com/free-ai-image/close-up-futuristic-sneakers-presentation_94954599.htm#fromView=search&page=1&position=43&uuid=f78f28df-9f09-487c-90f7-1172fcc92d12&query=shoes
https://www.freepik.com/free-ai-image/close-up-futuristic-sneakers_94954562.htm#fromView=search&page=1&position=36&uuid=f78f28df-9f09-487c-90f7-1172fcc92d12&query=shoes
"""

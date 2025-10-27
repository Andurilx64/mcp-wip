<p align="center">
<img src="https://github.com/user-attachments/assets/f783bf75-d51b-4d76-8448-608411dea41b" width=400>
</p>

# MCP-WIP: MCP Widget Integration Protocol

`mcp-wip` was created to revolutionize the connection between powerful AI engines and real UI widgets. With `mcp-wip`, your LLM directly selects widget specified through clear, declarative manifests provided by your MCP server. Widget implementation stays tech-agnostic, letting your frontend effortlessly integrate any framework through simple, custom bridges. The protocol is designed an extension of the MCP standard, allowing seemless integration with your own MCP server.

> This in experimental project in its early development stage. Treat it as an alpha. Any contributions to the project are well received!


<p align="center">
<video src="https://github.com/user-attachments/assets/cf81d1e1-a0e4-4610-ae4d-7a0e65e9b5a9"></video>
</p>

![Full HD video](example/assets/demo.mp4)

## 🎯 What's `mcp-wip`?

MCP-WIP offers an unified approach for the LLMs to intelligently select and instantiate UI widgets based on user requests. The system uses **Retrieval-Augmented Generation (RAG)** to match user intents with appropriate widgets (described by a standard declarative manifest), providing a seamless integration between conversational AI and interactive UI components.

### Key Features

- **Intelligent Widget Selection**: LLMs automatically choose the most relevant widget based on user intent
- **Widget Context Injection**: The MCP-WIP client supports the injection of additional context retrived at any time from a widget directly into the context, allowing the LLM to exactly reconstruct the status of the previously instantiated widget and user interactions.
- **RAG-Enhanced Search**: Optional and higly-customizable RAG support for efficient widget retrieval from large catalogs
- **Modular Architecture**: Clean separation between MCP client, MCP server, and widget components
- **Tool Integration**: Seamless integration with server-side tools and automatic tool call resolution (*agentic AI*)
- **Session Management**: Customizable memory support and context handling for multi-turn conversations
- **FastAPI Integration**: RESTful API with FastAPI for easy integration

## 🏗️ Architecture

The project follows a modular architecture with three main components:

```
┌─────────────────────────────────────────────────────────────┐
│                Frontend (Technology-agnostic)               | 
│                   Widget Renderer & UI                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP REST API
┌──────────────────────────▼──────────────────────────────────┐
│                         MCPWIPClient                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  • Chat Orchestration                                  │ │
│  │  • RAG-based Widget Retrieval                          │ │
│  │  • LLM Integration (OpenAI-compatible)                 │ │
│  │  • Session Memory Management                           │ │
│  │  • Tool Calling (agentic behaviour)                    │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ Stdio Transport (or StreamableHttp)
┌──────────────────────────▼──────────────────────────────────┐
│                  MCPWIPServer (FastMCP)                     │
│  ┌────────────────────────────────────────────────────────┐ │                      
│  │  • Custom Tools                                        │ │
│  │  • Resource Templates                                  │ │
│  │  • Widget manifests as resources                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### **MCPWIPClient**
- Orchestrates chat interactions with LLMs
- Manages widget selection through RAG or full catalog exposure on the MCP wip resources
- Handles tool calling to MCP server, enabling full agentic funcionality
- Handles template resources request on the MCP server
- Maintains session context and memory
- Provides REST API endpoints for frontend integration

#### **MCPWIPServer**
- Loads and serves widget manifests as MCP resources
- Exposes custom tools for data retrieval and manipulation
- Manages resource templates for dynamic data fetching
- Acts as the single source of truth for available widgets

#### **Widget System**
- Each widget is defined by a JSON manifest
- Manifests describe capabilities, parameters, and use cases 
- Widgets are rendered dynamically in the frontend
- LLM selects appropriate widget based on user request or intent

#### **Frontend Bridge sdks**
- Sdks for the most popular frontend frameworks
- Abstract UI component definition with predefined functionality for widget context retrival/injection
- Maps the widget resource uri selected by the LLM into the actual tech-specific UI component (e.g. a React component)
- React sdk already available (see `sdks/react`)

## 📦 Installation

### Prerequisites

- Python >= 3.12
- `uv` package manager 
- Node.js >= 18 (for React frontend, optional)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mcp-wip
   ```

2. **Install Python dependencies**
   ```bash
   # Using uv 
   uv sync

   # to use fastapi routes
   uv sync --extra fastapi

   # to use memvid rag
   uv sync --extra rag

   # sync directly all the dependencies
   uv sync --all-extras 
   ```

3. **Install React SDK dependencies** (for frontend)
   ```bash
   cd sdks/react
   npm install
   ```

## 🚀 Quick Start

### Running the Example

The system uses a **modular approach** where the client runs the server as a subprocess via StdioTransport:

```bash
uv run -m example.main
```

This single command:
1. Initializes the MCPWIPServer with widgets from `example/resources/widgets/`
2. Starts the MCPWIPClient with FastAPI on port 9000
3. Sets up RAG with pre-computed Memvid index
4. Exposes REST API endpoints at `http://localhost:9000/wip/`

### Available Endpoints

- `GET /wip/start-session` - Start a new chat session
- `POST /wip/chat` - Send a message and get AI response with widget selection
- `POST /wip/context-injection` - Inject widget context into conversation
- `GET /wip/manifest` - Get all available widget manifests
- `POST /wip/call-tool/{tool_name}` - Call a specific server tool

### React Demo Frontend

You can launch the example frontend with: 

```bash
cd example/chat
npm run dev
```

The React demo frontend wants to be a pilot of an enhanced chat interface, designed to go beyond standard conversational UIs. It showcases dynamic widget initialization and interaction—letting you see how widgets can be loaded, rendered, and controlled during a chat session. The interface handles widget context injection back on the MCP-WIP backend, allowing the LLM to access information on what the user has done in the widgets.

The central idea of this project is to blend a traditional UI (built from reusable widgets such as forms, pickers, or cards) with natural chat interactions, allowing for “Conversational Widgets.” This hybrid approach gives end-users the flexibility to interact with both form-based tools and natural language agents for a seamless, powerful collaborative workflow.



## 🔧 Module-by-Module Guide

### 1. MCPWIPServer Module (`core/mcp_server/`)

The server module is  handles widget registration and custom tools.

#### **Widget declarative manifest**

You can define new widgets as simple as this:

```python
new_widget = WidgetManifest(
            uri="wip://image-carousel",
            input_parameters_schema={
                "type": "object",
                "properties": {
                    "ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "A list of unique identifiers mapping to each image URL",
                    },
                },
                "required": ["ids"],
                "additionalProperties": False,
                "description": "Parameters required to render an image carousel, mapping ids with image URLs and their optional captions.",
            },
            capabilities=["full-screen", "menu"],
            description="""This widget helps users visualize multiple images of products in an interactive carousel, 
            providing an enhanced user interface for exploring items in detail. It improves the experience by allowing 
            users to easily browse through different product views or variations. 
            The image carousel is particularly useful for  galleries displaying various options of an item,
             or showcasing products from multiple angles in catalog or portfolio layouts.""",
            use_cases_hints="It should be selected when the user requests to see a product or a set of products in detail. ",
            version="1.0.0",
            name="Image Carousel",
        )
```

> **MCP-WIP manifests uri must be in the format "wip://...." to be correctly retrived**


#### **Basic Server Setup**


```python
from fastmcp import FastMCP
from core.mcp_server.server import MCPWIPServer

# Create FastMCP server
server = FastMCP("mcp-wip-server")

"""
Here you can add tools, resources and prompt as you would do it in FastMCP
via @tool, @prompt and @resource decorators

For more info, see the FastMCP docs or the example/server.py
"""

# Initialize MCPWIPServer with widget directory, where json manifests for widget are already saved
mcp_server = MCPWIPServer(
    input_dir="example/resources/widgets",
    server=server,
    load_from_directory=True
)

# Optionally add more manifest this way
mcp_server.add_manifest_json_resource(new_widget) # new_widget from the example before


if __name__=="__main__"
  # Run as process (for StdioTransport)
  mcp_server.run_as_process()
```


### 2. MCPWIPClient Module (`core/mcp_client/`)

The client orchestrates LLM interactions and widget selection.

#### **Client Initialization**

```python
from fastmcp.client import StdioTransport
from openai import AsyncOpenAI
from core.mcp_client.client import MCPWIPClient

# Set up transport to communicate with your costum server
# example.server should changed with your python file with your own MCPWIPServer 
transport = StdioTransport(
    "uv",
    args=["run", "-m", "example.server", "--transport", "stdio"]
)

# Initialize LLM client
llm_client = AsyncOpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

# Initialize MCPWIPClient
wip_client = MCPWIPClient(
    llm_client=llm_client,
    mcp_server_transport=transport,
    system_prompt=SYSTEM_PROMPT, # customize system prompt if you want (recommended)
    rag=rag,  # Optional: BaseRAG instance, you can use pre-defined one or your own
    model="openai/gpt-oss-20b"
)
```

#### **Running a Chat Turn**

```python
# Run a chat turn
messages = await wip_client.run_chat_turn(
    user_message="Show me my calendar for October",
    session_id="session-123"
)

# Response includes ToolMessage and AssistantMessage
# AssistantMessage would be a JSON formatted string, below the strucutre
```

The response from `run_chat_turn` will contain an `AssistantMessage` as a JSON-formatted string with the following fields:

```json
{
  "uri": "wip://widget-to-use",       
  "parameters": [                     
    {"name": "parameter1", "value": "some value"}
  ],
  "text": "Freeform text reply"       
}
```

- If no widget is required, `uri` will be `""`, `parameters` will be `[]`, and `text` will contain the AI's answer.


All responses strictly follow this JSON structure, outputted as a string.



### 3. RAG Module (`rag/`)

The RAG module provides intelligent widget retrieval.
You can inherit the abstract BaseRAG class for integrating the RAG solution you prefer. In the project, a simple in-memory solution with no additional vectorial db is implemented with the help of memvid library.

For an usage example please refer to `example/main.py`.

#### **Without RAG**

If no RAG is provided, all widgets are exposed to the LLM each turn. This works well for small widget catalogs (< 20 widgets).

### 4. Widget Manifests

Widgets are defined as JSON manifests with the following structure:

```json
{
  "uri": "wip://widget-name",
  "input_parameters_schema": {
    "type": "object",
    "properties": {
      "param1": {"type": "string"}
    }
  },
  "capabilities": ["display", "interact"],
  "name": "Widget Name",
  "description": "Detailed description of widget functionality",
  "use_cases_hints": "When to use this widget",
  "version": "1.0.0"
}
```



### 5. Widget Frontend Integration

After your widgets manifest are registered on the MCP-WIP server, you can implementent the actual widget logic in your favourite forntend framework, using the provided sdks (the only one available right now is React, but more will be added). 

#### React bridge sdk

**Widget Structure:**
```typescript
import type { WidgetProps, WidgetComponent } from '@mcp-wip/react-widget-sdk';

const MyWidget: WidgetComponent = ({ parameters }) => {
  return <div>Widget content</div>;
};

// Required metadata
MyWidget.widgetName = "My Widget";
MyWidget.description = "Widget description";
MyWidget.visualization = "both"; // "small" | "both" | "indipendent"
MyWidget.getIcon = () => <span>🎯</span>;

// Optional lifecycle methods
MyWidget.initWidget = (parameters, setParams) => { /* async setup */ };
MyWidget.getWidgetContext = () => { /* return current state */ };
MyWidget.setWidgetContext = (prevParams) => { /* handle context updates */ };
```

**Register Widgets:**
```typescript
import { registerWidgets } from '@mcp-wip/react-widget-sdk';

registerWidgets({
  'wip://my-widget': MyWidget,
  'wip://image-carousel': ImageCarouselWidget,
});
```

**Render Widget:**
```typescript
import { WidgetRenderer } from '@mcp-wip/react-widget-sdk';

<WidgetRenderer 
  uri="wip://image-carousel" 
  parameters={[{ name: "ids", value: ["sku123"] }]} 
/>
```




## 🔄 Complete Workflow Example

### Scenario: User Requests Stock Level Check

1. **User sends message**: "Check stock for SKU-123"
2. **Client receives request** via `POST /wip/chat`
3. **RAG searches** for top-k relevant widgets
4. **LLM processes** user intent, additional context from previous requests and the retrived widget manifest
5. **LLM decides** that the "wip://stock-inspector" should be instantiated, and tries to fetch the required parameters from the manifest 
 ```json
   {
     "uri": "wip://stock-level-inspector",
     "parameters": [{"name": "sku", "value": "SKU-123"}],
     "text": ""
   }
```
6. The frontend maps the widget uri to the `StockVisualizer` component, and instantiate it
7. The widget fetches the stock-availability of the sku "SKU-123", directly with the `get_stock` tool on the MCPWIP server (handled by MCPWIPClient)
8.  The `StockVisualizer` passes back its context back into the MCPWIPClient session before the next user request


## 📚 Project Structure

```
mcp-wip/
├── core/
│   ├── mcp_client/          # Client orchestration logic
│   │   ├── client.py         # Main MCPWIPClient class
│   │   ├── memory_handler.py # Session memory management
│   │   └── models.py         # Pydantic models
│   └── mcp_server/           # Server logic
│       ├── server.py         # Main MCPWIPServer class
│       └── models.py         # Widget manifest models
├── api/
│   ├── routes.py             # FastAPI routes
│   └── models.py            # API request/response models
├── rag/
│   ├── base.py              # Base RAG interface
│   └── memvid_rag.py        # Memvid implementation
├── example/
│   ├── main.py              # Main entry point
│   ├── server.py            # Server configuration
│   ├── resources/           # Widget manifests and RAG data
│   └── chat/                # React frontend
├── sdks/
│   └── react/               # React widget SDK
└── utils/
    └── widget_json_converter.py
```

## 🛣️ Roadmap

- [X] Protocol definition 
- [X] React sdk
- [ ] Other frontend bridges sdks (Flatter, ...)
- [ ] Managing authentication data on the bridge interface
- [ ] Widget manifests version management support
- [ ] Context injection in the widget 
- [ ] Frontend bridge addional functionalities (notification system, telemetry)
- [ ] Typescript MCPWIPCLient 
- [ ] Additional llm providers support 

Any help is appreciated!


## 🙏 Acknowledgments

- Built on [FastMCP](https://github.com/jlowin/fastmcp) for MCP implementation
- Uses [Memvid](https://github.com/Olow304/memvid) for RAG capabilities
- React SDK inspired by modular widget architectures

---

For detailed API documentation, see the inline docstrings in each module.


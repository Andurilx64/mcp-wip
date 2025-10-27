"""MCP server definition"""

import os
import json
import logging
import argparse
from typing import Dict, List, Any, Literal

from fastmcp import FastMCP
from fastmcp.resources import TextResource
from .models import WidgetManifest


class MCPWIPServer:
    """MCP server class"""

    def __init__(
        self,
        input_dir: str,
        server: FastMCP,
        load_from_directory: bool = True,
        log_lvl: Literal[0, 10, 20, 30, 40, 50] = logging.DEBUG,
    ):
        """
        Initialize the MCPWIPServer instance
        Args:
            input_dir (str): Path to the directory containing widget manifest JSON files.
            server (FastMCP): Instance of the underlying FastMCP server.
            load_from_directory (bool, optional): Whether to automatically load resources from the directory on initialization. Defaults to True.
            log_lvl
        """
        self.input_dir = input_dir
        self.server = server
        self.logger = logging.getLogger("MCPWIPServer")
        self.logger.setLevel(log_lvl)
        if load_from_directory:
            self._load_resources()

    def _load_resources(self):
        """
        Loads all JSON manifest files from input_dir as WidgetManifest and registers as resources.
        """
        for fname in os.listdir(self.input_dir):
            if fname.endswith(".json"):
                fpath = os.path.join(self.input_dir, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    manifest = WidgetManifest(**data)
                    self.add_manifest_json_resource(manifest)
                    self.logger.debug("Added resource %s", manifest.uri)
                except Exception as e:
                    logging.warning("Error in reading a json manifest %s", e)
                    continue

    def add_manifest_json_resource(
        self,
        manifest: WidgetManifest,
        tags: List[str] = ["ui"],
        meta: Dict[str, Any] = None,
    ):
        """
        Adds a widget manifest as a JSON text resource to the server.

        Registers the manifest under its URI and specified tags, using its JSON serialization as the resource content.

        Args:
            manifest (WidgetManifest): The manifest to register as a resource.
            tags (List[str], optional): Tags to associate with the resource. Defaults to ["ui"].
            meta (Dict[str, Any], optional): Additional metadata for the resource.
        """

        uri = getattr(manifest, "uri", None)
        name = getattr(manifest, "name", None)
        title = getattr(manifest, "title", None)
        description = getattr(manifest, "description", None)
        mime_type = "application/json"

        resource: TextResource = TextResource(
            uri=uri,
            name=name or title or uri,
            title=title,
            description=description,
            tags=tags,
            mime_type=mime_type,
            meta=meta,
            text=manifest.model_dump_json(),
        )
        self.server.add_resource(resource)

    def get_server(self) -> FastMCP:
        """Retruns the FastMCP instance"""
        return self.server

    def run_as_server(self, host: str, port: int):
        """
        Runs the server as a HTTP server.

        Args:
            host (str): the host for the socket
            port (int): http port exposed
        """
        self.server.run(transport="http", host=host, port=port, path="/mcp")

    def run_as_process(self, input_dir: str = None, additional_tools: List = None):
        """
        Runs the server as a process with StdioTransport.
        This allows for proper initialization before the server starts.

        Args:
            input_dir: Directory to load manifests from (overrides self.input_dir)
            additional_tools: List of additional tools to register
        """

        # Override input directory if provided
        if input_dir:
            self.input_dir = input_dir
            self._load_resources()

        # Add any additional tools
        if additional_tools:
            for tool in additional_tools:
                self.server.add_tool(tool)

        # Run with stdio transport
        self.server.run(transport="stdio")


def main():
    """Main function to instantiate the server"""
    parser = argparse.ArgumentParser(description="MCP WIP Server")
    parser.add_argument(
        "--input-dir",
        type=str,
        default="./manifests",
        help="Directory containing widget manifest JSON files",
    )
    parser.add_argument(
        "--transport",
        choices=["stdio", "http"],
        default="stdio",
        help="Transport method to use",
    )
    parser.add_argument(
        "--host", type=str, default="localhost", help="Host for HTTP transport"
    )
    parser.add_argument(
        "--port", type=int, default=8000, help="Port for HTTP transport"
    )

    args = parser.parse_args()

    # Create FastMCP server instance
    server = FastMCP("mcp-wip-server")

    # Create our MCP server wrapper
    mcp_server = MCPWIPServer(
        input_dir=args.input_dir, server=server, load_from_directory=True
    )

    # Run based on transport choice
    if args.transport == "stdio":
        mcp_server.run_as_process()
    else:
        mcp_server.run_as_server(args.host, args.port)


if __name__ == "__main__":
    main()

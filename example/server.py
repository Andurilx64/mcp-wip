"""
This file shows how to properly configure your MCPWIPServer with:

- custom fastmcp tools;
- custom fastmcp resource-templates;
- custom fastmcp resources not wip-related

This file is essential:

- run the MCPWIPServer as a proper server, using StreamableHttp as transport in the MCPWIPClient
- run the MCPWIPServer using Stdio, i.e. the MCPWIPClient runs the MCPWIPServer

"""

import argparse
from calendar import monthrange
from fastmcp import Context, FastMCP
from core.mcp_server.server import MCPWIPServer


# main fastmcp server
server = FastMCP("mcp-wip-server")


# add a custom tool
@server.tool(
    description="Given an sku, checks its stock availability in the warehouse. It returns the stock level for each size variant of the given sku. Use this tool when the user request any particular information about the availability of a product.",
    output_schema={
        "type": "object",
        "properties": {
            "sku": {"type": "string", "description": "The SKU being queried"},
            "stock_by_size": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "size": {
                            "type": "string",
                            "description": "The size variant (e.g., 39, 40, M, L, etc.)",
                        },
                        "stock": {
                            "type": "integer",
                            "description": "Stock level for this size",
                        },
                    },
                    "required": ["size", "stock"],
                    "additionalProperties": False,
                },
                "description": "Array of objects representing size and corresponding stock level",
            },
        },
        "required": ["sku", "stock_by_size"],
        "additionalProperties": False,
    },
)
def get_stock_for_sku(sku: str):
    return {
        "sku": sku,
        "stock_by_size": [
            {"size": "39", "stock": 4},
            {"size": "40", "stock": 1},
            {"size": "41", "stock": 0},
            {"size": "42", "stock": 3},
        ],
    }


# mock calendar data
# Mock calendar data for testing (using Python dict with dates as string keys)
calendar = {
    "2025-10-20": [
        {"id": "1", "title": "Team Meeting", "init": "10:00", "end": "13:00"}
    ],
    "2025-10-14": [{"id": "2", "title": "Project Deadline", "init": "", "end": ""}],
    "2025-10-26": [
        {"id": "3", "title": "Lunch with Alex", "init": "12:00", "end": "12:30"},
        {"id": "4", "title": "Dentist", "init": "15:30", "end": "16:30"},
    ],
}


# add a custom tool
@server.tool(
    name="create_appointment",
    description="""Create a new calendar appointment for a specific date with a description and time. If the start and end times are not specified, create an all-day event.
    The date format is yyyy-mm-dd, the times format is hh:mm.""",
)
def create_appointment(
    date: str, description: str, start_time: str = "", end_time: str = ""
):
    """
    Create a new appointment on the given date with specified description and times.
    """
    import uuid

    event_id = str(uuid.uuid4())
    if (start_time != "") and (end_time == ""):
        # add 1 hour to start time
        try:
            from datetime import datetime, timedelta

            dt = datetime.strptime(start_time, "%H:%M")
            dt_end = dt + timedelta(hours=1)
            end_time = dt_end.strftime("%H:%M")
        except Exception:
            end_time = start_time
    event = {
        "id": event_id,
        "title": description,
        "init": start_time,
        "end": end_time,
    }
    if date not in calendar:
        calendar[date] = []
    calendar[date].append(event)
    return {
        "status": "success",
        "event": event,
        "date": date,
    }


# add a resource template
@server.resource(
    uri="calendar://calendar/{year}/{month}",
    description="Fetch all calendar events for a given year and month.",
)
def get_calendar_for_month(year: int, month: int):
    """
    Returns all calendar events for the given year and month.
    """

    # Find all events matching the year and month
    results = []

    # Get number of days in the month
    _, last_day = monthrange(year, month)

    for day in range(1, last_day + 1):
        date_key = f"{year:04d}-{month:02d}-{day:02d}"
        if date_key in calendar:
            for event in calendar[date_key]:
                event_copy = dict(event)
                event_copy["date"] = date_key
                results.append(event_copy)

    return {"events": results}


# add a resource template
@server.resource(
    uri="calendar://calendar/{year}/{month}/{day}",
    description="Fetch all calendar events for a given year and month.",
)
def get_calendar_for_day(year: int, month: int, day: int):
    """
    Returns all calendar events for the given year and month.
    """

    # Find all events matching the year and month
    results = []

    date_key = f"{year:04d}-{month:02d}-{day:02d}"
    if date_key in calendar:
        for event in calendar[date_key]:
            event_copy = dict(event)
            event_copy["date"] = date_key
            results.append(event_copy)
    return {"events": results}


# add a tool
@server.tool(
    description="Reads the calendar events given the date in the format yyyy-mm-dd.",
    name="read_daily_calendar",
)
def read_daily_calendar(date: str, ctx: Context):
    # Assume the date is in format "YYYY-MM-DD"
    try:
        year_str, month_str, day_str = date.split("-")
        year = int(year_str)
        month = int(month_str)
        day = int(day_str)
    except Exception:
        return {"error": "Invalid date format. Expected YYYY-MM-DD."}

    resource_uri = f"calendar://calendar/{year}/{month}/{day}"
    result = ctx.read_resource(resource_uri)
    return result


# add a tool
@server.tool(
    description="Given an sku, this tool searches for similar skus in the catalog. It returns the list of the similar sku.",
    name="get_similar_products",
    output_schema={
        "type": "object",
        "properties": {
            "results": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "sku": {"type": "string", "description": "A similar sku"},
                        "similarity": {
                            "type": "number",
                            "description": "Similairty score (higher score indicates higher similarity)",
                        },
                    },
                    "required": ["sku"],
                },
                "description": "List of similar skus and their associated URLs",
            }
        },
        "required": ["results"],
        "additionalProperties": False,
    },
)
def get_similar_product(sku: str):
    # Placeholder: return some sample data for similar skus
    import random

    available = ["sku2345", "shoes1", "sku5678", "shoe343", "ckkje24"]
    available_shuffled = [x for x in available if x != sku]
    random.shuffle(available_shuffled)
    if len(available_shuffled) >= 2:
        n1, n2 = available_shuffled[:2]
    elif len(available_shuffled) == 1:
        n1 = n2 = available_shuffled[0]
    else:
        n1 = n2 = "SIMILAR_DEFAULT"
    return {"results": [{"sku": n1, "similarity": 0.7}, {"sku": n2, "similarity": 0.5}]}


if __name__ == "__main__":
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

    # init MCPWIPServer and load resources from directory, using the fastMCP server as base
    mcp_server = MCPWIPServer(
        input_dir=args.input_dir, server=server, load_from_directory=True
    )

    if args.transport == "stdio":
        mcp_server.run_as_process()
    else:
        mcp_server.run_as_server(args.host, args.port)

"""
Example definition of multiple WidgetManifest, and how to save them for later retrival
"""

from core.mcp_server.models import WidgetManifest
from utils.widget_json_converter import write_manifests_to_json

r = []

r.append(
    (
        WidgetManifest(
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
            description="""This widget helps users visualize multiple images of products in an interactive carousel, providing an enhanced user interface for exploring items in detail. It improves the experience by allowing users to easily browse through different product views or variations. The image carousel is particularly useful for  galleries displaying various options of an item, or showcasing products from multiple angles in catalog or portfolio layouts.""",
            use_cases_hints="It should be selected when the user requests to see a product or a set of products in detail. ",
            version="1.0.0",
            name="Image Carousel",
        ),
        "image-carousel",
    )
)

r.append(
    (
        WidgetManifest(
            uri="wip://stock-level-inspector",
            input_parameters_schema={
                "type": "object",
                "properties": {
                    "sku": {
                        "type": "string",
                        "description": "The Stock Keeping Unit (SKU) identifier for the product to inspect.",
                    },
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
                "required": ["sku"],
                "additionalProperties": False,
                "description": "Parameters required to visualize the current stock levels of a given SKU across one or more warehouses or storage locations.",
            },
            capabilities=["real-time", "chart-view", "alerting"],
            description="""This widget allows users to inspect the current stock levels of a specific SKU across one or multiple warehouses. It supports real-time updates and visual indicators to highlight shortages or excess inventory. The stock level inspector enhances inventory management workflows and provides insights for restocking and logistics planning.""",
            use_cases_hints="Select this widget when the user requests to check, monitor, or compare inventory quantities of specific SKUs.",
            version="1.0.0",
            name="Stock Level Inspector",
        ),
        "stock-level-inspector",
    )
)

r.append(
    (
        WidgetManifest(
            uri="wip://calendar",
            input_parameters_schema={
                "type": "object",
                "properties": {
                    "initial_date": {
                        "type": "string",
                        "format": "date",
                        "description": "The initial date to display when the calendar opens.",
                    },
                    "events": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "title": {"type": "string"},
                                "start": {"type": "string", "format": "date-time"},
                                "end": {"type": "string", "format": "date-time"},
                                "description": {"type": "string"},
                            },
                            "required": ["id", "title", "start", "end"],
                        },
                        "description": "A list of existing events or meetings to render in the calendar.",
                    },
                    "allow_meeting_creation": {
                        "type": "boolean",
                        "description": "If true, the user can create new meetings or events directly from the calendar.",
                    },
                },
                "required": ["initial_date"],
                "additionalProperties": False,
                "description": "Parameters required to display a calendar interface with optional meeting creation and event visualization capabilities.",
            },
            capabilities=["date-picker", "event-management", "interactive-ui"],
            description="""This widget provides a full-featured calendar view that allows users to browse dates, view events, and schedule new meetings. It supports interactive event management and integrates seamlessly with scheduling or task management systems. The calendar widget enhances productivity by offering a clear and intuitive interface for managing appointments and availability.""",
            use_cases_hints="Use this widget when the user requests to view a calendar, pick a date, or schedule or review meetings.",
            version="1.0.0",
            name="Calendar Widget",
        ),
        "calendar",
    )
)

r.append(
    (
        WidgetManifest(
            uri="wip://qr-code-scanner",
            input_parameters_schema={
                "type": "object",
                "properties": {
                    "camera_permission": {
                        "type": "boolean",
                        "description": "Indicates whether the user has granted permission to access the device camera.",
                    },
                    "expected_format": {
                        "type": "string",
                        "enum": ["qr", "barcode", "datamatrix"],
                        "description": "Defines the expected code format to scan for better accuracy.",
                    },
                    "on_scan_action": {
                        "type": "string",
                        "description": "The action or callback URI to trigger once a product code is successfully scanned.",
                    },
                },
                "required": ["camera_permission"],
                "additionalProperties": False,
                "description": "Parameters required to activate a QR or barcode scanner to identify and process product codes.",
            },
            capabilities=["camera-access", "real-time-scan", "code-detection"],
            description="""This widget enables real-time scanning of QR codes or barcodes using the device camera. It is designed to identify product codes quickly and can trigger subsequent actions such as product lookups, inventory updates, or redirection to detailed product views. The scanner enhances workflows that involve physical product interaction, such as logistics, retail, or manufacturing.""",
            use_cases_hints="Select this widget when the user needs to scan a QR code or barcode to identify or access product-related information.",
            version="1.0.0",
            name="Qr code scanner",
        ),
        "qr-code-scanner",
    )
)


write_manifests_to_json(r, input_dir="example/resources/widgets")

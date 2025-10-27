"""Class that defines the schema of ui manifests"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class WidgetManifest(BaseModel):
    """Widget manifest describing a UI widget and its metadata."""

    uri: str = Field(
        ..., description="The URI endpoint or unique identifier for the widget resource"
    )
    input_parameters_schema: Dict[str, Any] = Field(
        default_factory=dict,
        description="Schema describing the input parameters for the widget",
    )
    capabilities: Optional[List[str]] = Field(
        None,
        description="Capabilities supported by the widget (e.g. ['display', 'interact', 'update'])",
    )
    name: str = Field(..., description="The name of the widget")
    description: str = Field(
        ...,
        description="The general description of the aspect and functionality of each widget",
    )
    use_cases_hints: str = Field(
        ..., description="Some hints on when the widget should be used"
    )
    version: str = Field(..., description="Semantic verioning for the widget")

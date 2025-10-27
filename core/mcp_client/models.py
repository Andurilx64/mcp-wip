"""Pydantic models for the MCP client"""

from typing import Dict, Any, Optional, List, Union
from pydantic import BaseModel, Field
from pydantic.config import ConfigDict


class ToolMessage(BaseModel):
    """Tool message response"""

    role: str = Field(default="tool")
    tool: str
    arguments: Dict[str, Any]
    result: str


class AssistantMessage(BaseModel):
    """Assistant message response"""

    role: str = Field(default="assistant")
    content: Optional[str] = None


class ParameterKV(BaseModel):
    """Generic dictionary field to be included in ValidResponse"""

    # model_config = ConfigDict(extra="forbid")
    name: str
    value: Union[str, int, float, bool, list, None] = None


class ValidResponse(BaseModel):
    """Valid response of the model"""

    model_config = ConfigDict(extra="forbid")

    uri: str = Field("", description="The uri of the widgets")
    parameters: List[ParameterKV] = Field(
        default_factory=list, description="Dynamic parameters as list of key/value"
    )
    text: str = Field("", description="the model text response")

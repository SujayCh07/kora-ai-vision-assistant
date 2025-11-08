from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class Quadrant(str, Enum):
    TOP_LEFT = "top_left"
    TOP_CENTER = "top_center"
    TOP_RIGHT = "top_right"
    MIDDLE_LEFT = "middle_left"
    CENTER = "center"
    MIDDLE_RIGHT = "middle_right"
    BOTTOM_LEFT = "bottom_left"
    BOTTOM_CENTER = "bottom_center"
    BOTTOM_RIGHT = "bottom_right"


class Environment(str, Enum):
    INDOOR = "indoor"
    OUTDOOR = "outdoor"


class BoundingBox(BaseModel):
    x_min: float = Field(..., ge=0.0, le=1.0)
    y_min: float = Field(..., ge=0.0, le=1.0)
    x_max: float = Field(..., ge=0.0, le=1.0)
    y_max: float = Field(..., ge=0.0, le=1.0)

    @property
    def width(self) -> float:
        return self.x_max - self.x_min

    @property
    def height(self) -> float:
        return self.y_max - self.y_min

    @property
    def center(self) -> tuple[float, float]:
        return (self.x_min + self.width / 2, self.y_min + self.height / 2)


class DetectedObject(BaseModel):
    label: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    bounding_box: BoundingBox
    quadrant: Quadrant
    relative_depth_m: Optional[float] = Field(None, ge=0.0)


class CenterDistanceSummary(BaseModel):
    distance_m: Optional[float] = Field(None, ge=0.0)
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    advisory: Optional[str] = None


class FrameMetadata(BaseModel):
    width: int = Field(..., gt=0)
    height: int = Field(..., gt=0)
    focal_length_px: Optional[float] = Field(None, gt=0)


class FrameAnalysisRequest(BaseModel):
    frame_id: str
    timestamp: datetime
    frame_metadata: FrameMetadata
    image_base64: str = Field(..., description="RGB frame encoded as base64 string")
    environment: Environment = Environment.INDOOR


class FrameAnalysisResponse(BaseModel):
    frame_id: str
    objects: List[DetectedObject]
    center_distance: CenterDistanceSummary
    notes: Optional[str] = None

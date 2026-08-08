from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_serializer


class HealthResponse(BaseModel):
    status: Literal["ok"]
    timestamp: datetime
    app_name: str

    @field_serializer("timestamp")
    def serialize_timestamp(self, value: datetime) -> str:
        return value.isoformat(timespec="milliseconds").replace("+00:00", "Z")

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_serializer


class ReadinessResponse(BaseModel):
    status: Literal["ready"]
    timestamp: datetime
    app_name: str
    database: Literal["ok"]

    @field_serializer("timestamp")
    def serialize_timestamp(self, value: datetime) -> str:
        return value.isoformat(timespec="milliseconds").replace("+00:00", "Z")

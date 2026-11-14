import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import UserRole


class LoginRequest(BaseModel):
    token: str = Field(min_length=10, max_length=300)

    @field_validator("token")
    @classmethod
    def rapikan(cls, v: str) -> str:
        return v.strip()


class UserMe(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nama_lengkap: str
    role: UserRole
    halaqah_id: uuid.UUID | None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: UserMe

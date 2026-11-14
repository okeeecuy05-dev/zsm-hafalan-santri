import uuid

from pydantic import BaseModel, ConfigDict


class SantriRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nama_lengkap: str
    halaqah_id: uuid.UUID | None


class UstadzRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nama_lengkap: str
    halaqah_id: uuid.UUID | None

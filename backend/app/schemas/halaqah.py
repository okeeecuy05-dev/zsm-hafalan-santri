import uuid

from pydantic import BaseModel, ConfigDict


class HalaqahRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nama_kelas: str
    ustadz_id: uuid.UUID | None

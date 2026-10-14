from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=255,
    )
    email: EmailStr
    password: str = Field(
        min_length=8,
        max_length=128,
    )
    role: UserRole = UserRole.STAFF


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    name: str
    email: EmailStr
    role: UserRole
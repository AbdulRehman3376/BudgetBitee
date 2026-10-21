from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


VerificationStatus = Literal["sample", "unverified", "verified"]


class VendorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=5000)
    address: str | None = Field(default=None, max_length=300)
    area: str = Field(default="UMT, Johar Town", min_length=1, max_length=120)
    contact_phone: str | None = Field(default=None, max_length=30)
    verification_status: VerificationStatus = "unverified"


class VendorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    address: str | None
    area: str
    contact_phone: str | None
    verification_status: str
    is_active: bool
    created_at: datetime


class MenuItemCreate(BaseModel):
    vendor_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=5000)
    price: Decimal = Field(ge=Decimal("0"), max_digits=10, decimal_places=2)
    currency: str = Field(default="PKR", pattern=r"^[A-Z]{3}$")
    data_status: VerificationStatus = "sample"


class MenuItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vendor_id: int
    name: str
    description: str | None
    price: Decimal
    currency: str
    data_status: str
    price_checked_at: datetime | None
    is_available: bool | None
    is_active: bool
    created_at: datetime

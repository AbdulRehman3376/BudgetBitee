from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import Base, engine, get_db
from app.budget_models import BudgetPlan
from app.models import Vendor, MenuItem

Base.metadata.create_all(bind=engine)

app = FastAPI(

title="BudgetBite API",
    description="Budget-conscious food discovery for the UMT pilot area.",
    version="0.1.0",
)

# Local development: allow the frontend served from localhost.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?",
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


@app.get("/health", tags=["System"])
def health_check() -> dict[str, str]:
    """Return the service health status."""
    return {
        "status": "ok",
        "service": "BudgetBite API",
    }

@app.get("/", tags=["System"])
def root() -> dict[str, str]:
    """Return basic API information."""
    return {
        "name": "BudgetBite API",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Vendor
from app.schemas import VendorCreate, VendorRead

@app.get("/vendors", response_model=list[VendorRead], tags=["Vendors"])
def list_vendors(db: Session = Depends(get_db)) -> list[Vendor]:
    """Return active vendors ordered by name."""
    statement = (
        select(Vendor)
        .where(Vendor.is_active.is_(True))
        .order_by(Vendor.name)
    )
    return list(db.scalars(statement).all())


@app.get(
    "/vendors/{vendor_id}",
    response_model=VendorRead,
    tags=["Vendors"],
)
def get_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
) -> Vendor:
    """Return one vendor by its identifier."""
    vendor = db.get(Vendor, vendor_id)
    if vendor is None or not vendor.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found.",
        )
    return vendor


@app.post(
    "/vendors",
    response_model=VendorRead,
    status_code=status.HTTP_201_CREATED,
    tags=["Vendors"],
)
def create_vendor(
    payload: VendorCreate,
    db: Session = Depends(get_db),
) -> Vendor:
    """Create a vendor record."""
    vendor = Vendor(**payload.model_dump())
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor
from app.models import MenuItem
from app.schemas import MenuItemCreate, MenuItemRead


@app.get("/vendors/{vendor_id}/menu", response_model=list[MenuItemRead], tags=["Menu"])
def list_vendor_menu(vendor_id: int, db: Session = Depends(get_db)) -> list[MenuItem]:
    """Return active menu items for an active vendor."""
    vendor = db.get(Vendor, vendor_id)
    if vendor is None or not vendor.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found.")

    statement = (
        select(MenuItem)
        .where(MenuItem.vendor_id == vendor_id, MenuItem.is_active.is_(True))
        .order_by(MenuItem.name)
    )
    return list(db.scalars(statement).all())


@app.get("/menu-items/{item_id}", response_model=MenuItemRead, tags=["Menu"])
def get_menu_item(item_id: int, db: Session = Depends(get_db)) -> MenuItem:
    """Return one active menu item."""
    item = db.get(MenuItem, item_id)
    if item is None or not item.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found.")
    return item


@app.post("/vendors/{vendor_id}/menu", response_model=MenuItemRead, status_code=status.HTTP_201_CREATED, tags=["Menu"])
def create_vendor_menu_item(
    vendor_id: int,
    payload: MenuItemCreate,
    db: Session = Depends(get_db),
) -> MenuItem:
    """Create a menu item for an existing active vendor."""
    vendor = db.get(Vendor, vendor_id)
    if vendor is None or not vendor.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found.")

    if payload.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The payload vendor_id must match the URL vendor_id.",
        )

    item = MenuItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


class BudgetPayload(BaseModel):
    payload: dict = Field(default_factory=dict)

@app.get("/budget/{profile_id}", tags=["Budget"])
def get_budget(profile_id: str, db: Session = Depends(get_db)) -> dict:
    if len(profile_id) > 80 or not profile_id.strip():
        raise HTTPException(status_code=422, detail="Invalid profile identifier.")
    item = db.query(BudgetPlan).filter(BudgetPlan.profile_id == profile_id).first()
    return {"profile_id": profile_id, "payload": item.payload if item else None}

@app.put("/budget/{profile_id}", tags=["Budget"])
def save_budget(profile_id: str, body: BudgetPayload, db: Session = Depends(get_db)) -> dict:
    if len(profile_id) > 80 or not profile_id.strip():
        raise HTTPException(status_code=422, detail="Invalid profile identifier.")
    item = db.query(BudgetPlan).filter(BudgetPlan.profile_id == profile_id).first()
    if item is None:
        item = BudgetPlan(profile_id=profile_id, payload=body.payload)
        db.add(item)
    else:
        item.payload = body.payload
    db.commit()
    db.refresh(item)
    return {"profile_id": profile_id, "payload": item.payload, "updated_at": item.updated_at}


@app.delete("/vendors/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Vendors"])
def delete_vendor(vendor_id: int, db: Session = Depends(get_db)) -> None:
    """Soft-delete a vendor and its menu items (rows are kept, flagged inactive)."""
    vendor = db.get(Vendor, vendor_id)
    if vendor is None or not vendor.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found.")
    vendor.is_active = False
    for item in vendor.menu_items:
        item.is_active = False
    db.commit()


@app.delete("/menu-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Menu"])
def delete_menu_item(item_id: int, db: Session = Depends(get_db)) -> None:
    """Soft-delete one menu item."""
    item = db.get(MenuItem, item_id)
    if item is None or not item.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found.")
    item.is_active = False
    db.commit()
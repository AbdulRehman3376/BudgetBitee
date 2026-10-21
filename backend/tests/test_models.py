import sys
import unittest
from decimal import Decimal
from pathlib import Path

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.database import Base
from app.models import MenuItem, Vendor


class TestBudgetBiteModels(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_required_tables_exist(self):
        tables = set(inspect(self.engine).get_table_names())
        self.assertTrue({"vendors", "menu_items"}.issubset(tables))

    def test_vendor_creation_defaults_to_unverified(self):
        vendor = Vendor(name="Sample UMT Vendor")
        self.db.add(vendor)
        self.db.commit()
        self.db.refresh(vendor)

        self.assertIsNotNone(vendor.id)
        self.assertEqual(vendor.verification_status, "unverified")
        self.assertTrue(vendor.is_active)

    def test_menu_item_has_decimal_price_and_sample_status(self):
        vendor = Vendor(name="Sample Vendor")
        self.db.add(vendor)
        self.db.flush()

        item = MenuItem(
            vendor_id=vendor.id,
            name="Sample Meal",
            price=Decimal("250.50"),
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)

        self.assertEqual(item.price, Decimal("250.50"))
        self.assertEqual(item.currency, "PKR")
        self.assertEqual(item.data_status, "sample")

    def test_vendor_menu_relationship(self):
        vendor = Vendor(name="Relationship Test Vendor")
        vendor.menu_items.append(
            MenuItem(name="Test Burger", price=Decimal("300.00"))
        )
        self.db.add(vendor)
        self.db.commit()
        self.db.refresh(vendor)

        self.assertEqual(len(vendor.menu_items), 1)
        self.assertEqual(vendor.menu_items[0].name, "Test Burger")

    def test_menu_item_defaults_availability_to_unknown(self):
        vendor = Vendor(name="Availability Test Vendor")
        self.db.add(vendor)
        self.db.flush()

        item = MenuItem(
            vendor_id=vendor.id,
            name="Unconfirmed Meal",
            price=Decimal("180.00"),
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)

        self.assertIsNone(item.is_available)
        self.assertIsNone(item.price_checked_at)


    def test_negative_price_rejected(self):
        from sqlalchemy.exc import IntegrityError

        vendor = Vendor(name="Negative Price Test Vendor")
        self.db.add(vendor)
        self.db.flush()

        item = MenuItem(
            vendor_id=vendor.id,
            name="Invalid Negative Price",
            price=Decimal("-1.00"),
        )
        self.db.add(item)

        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()


    def test_invalid_data_status_rejected(self):
        from sqlalchemy.exc import IntegrityError

        vendor = Vendor(name="Invalid Status Test Vendor")
        self.db.add(vendor)
        self.db.flush()

        item = MenuItem(
            vendor_id=vendor.id,
            name="Invalid Status Item",
            price=Decimal("100.00"),
            data_status="invalid_status",
        )
        self.db.add(item)

        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()


    def test_vendor_update_persists(self):
        vendor = Vendor(name="Original Vendor Name")
        self.db.add(vendor)
        self.db.commit()

        vendor.name = "Updated Vendor Name"
        self.db.commit()

        saved = self.db.get(Vendor, vendor.id)
        self.assertEqual(saved.name, "Updated Vendor Name")


    def test_menu_item_read_and_delete(self):
        vendor = Vendor(name="CRUD Test Vendor")
        self.db.add(vendor)
        self.db.flush()

        item = MenuItem(
            vendor_id=vendor.id,
            name="CRUD Test Meal",
            price=Decimal("275.00"),
        )
        self.db.add(item)
        self.db.commit()

        item_id = item.id
        saved = self.db.get(MenuItem, item_id)
        self.assertIsNotNone(saved)
        self.assertEqual(saved.name, "CRUD Test Meal")

        self.db.delete(saved)
        self.db.commit()

        self.assertIsNone(self.db.get(MenuItem, item_id))


if __name__ == "__main__":
    unittest.main()

import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.database import Base, get_db
from app.main import app


class TestMenuAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.TestSession = sessionmaker(
            bind=cls.engine,
            autoflush=False,
            autocommit=False,
        )

        def override_get_db():
            db = cls.TestSession()
            try:
                yield db
            finally:
                db.close()

        cls.override_get_db = override_get_db
        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        app.dependency_overrides.pop(get_db, None)
        Base.metadata.drop_all(bind=cls.engine)
        cls.engine.dispose()

    def setUp(self):
        Base.metadata.drop_all(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)

    def create_vendor(self):
        response = self.client.post(
            "/vendors",
            json={
                "name": "Isolated Menu Test Vendor",
                "area": "UMT, Johar Town",
                "verification_status": "sample",
            },
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["id"]

    def test_vendor_menu_starts_empty(self):
        vendor_id = self.create_vendor()
        response = self.client.get(f"/vendors/{vendor_id}/menu")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), [])

    def test_create_and_read_menu_item(self):
        vendor_id = self.create_vendor()
        payload = {
            "vendor_id": vendor_id,
            "name": "Chicken Biryani",
            "description": "Test data only",
            "price": "350.00",
            "currency": "PKR",
            "data_status": "sample",
        }

        created = self.client.post(
            f"/vendors/{vendor_id}/menu",
            json=payload,
        )
        self.assertEqual(created.status_code, 201, created.text)

        item = created.json()
        self.assertEqual(item["name"], "Chicken Biryani")
        self.assertEqual(item["price"], "350.00")
        self.assertEqual(item["data_status"], "sample")

        detail = self.client.get(f"/menu-items/{item['id']}")
        self.assertEqual(detail.status_code, 200, detail.text)
        self.assertEqual(detail.json()["name"], "Chicken Biryani")

    def test_missing_vendor_returns_404(self):
        response = self.client.post(
            "/vendors/2147483647/menu",
            json={
                "vendor_id": 2147483647,
                "name": "Test Item",
                "price": "100.00",
            },
        )
        self.assertEqual(response.status_code, 404, response.text)

    def test_negative_price_is_rejected(self):
        vendor_id = self.create_vendor()
        response = self.client.post(
            f"/vendors/{vendor_id}/menu",
            json={
                "vendor_id": vendor_id,
                "name": "Invalid Price Item",
                "price": "-10.00",
            },
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_vendor_id_mismatch_is_rejected(self):
        vendor_id = self.create_vendor()
        response = self.client.post(
            f"/vendors/{vendor_id}/menu",
            json={
                "vendor_id": vendor_id + 1,
                "name": "Mismatched Vendor Item",
                "price": "100.00",
            },
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_missing_menu_item_returns_404(self):
        response = self.client.get("/menu-items/2147483647")
        self.assertEqual(response.status_code, 404, response.text)


if __name__ == "__main__":
    unittest.main()

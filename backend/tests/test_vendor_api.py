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


class TestVendorAPI(unittest.TestCase):
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
        Base.metadata.create_all(bind=cls.engine)

        def override_get_db():
            db = cls.TestSession()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    def setUp(self):
        Base.metadata.drop_all(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        app.dependency_overrides.pop(get_db, None)
        Base.metadata.drop_all(bind=cls.engine)
        cls.engine.dispose()

    def test_vendor_list_returns_empty_list(self):
        response = self.client.get("/vendors")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_vendor_create_and_read(self):
        response = self.client.post(
            "/vendors",
            json={
                "name": "Isolated Test Vendor",
                "area": "UMT, Johar Town",
                "verification_status": "sample",
            },
        )
        self.assertEqual(response.status_code, 201)
        vendor = response.json()
        self.assertEqual(vendor["name"], "Isolated Test Vendor")

        detail = self.client.get(f"/vendors/{vendor['id']}")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["name"], "Isolated Test Vendor")

    def test_empty_vendor_name_is_rejected(self):
        response = self.client.post(
            "/vendors",
            json={"name": ""},
        )
        self.assertEqual(response.status_code, 422)

    def test_missing_vendor_returns_404(self):
        response = self.client.get("/vendors/2147483647")
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()

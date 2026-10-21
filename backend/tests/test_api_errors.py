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


class TestAPIErrorHandling(unittest.TestCase):
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

    def test_invalid_vendor_payload_returns_422(self):
        response = self.client.post("/vendors", json={"name": ""})
        self.assertEqual(response.status_code, 422)

    def test_missing_vendor_returns_404(self):
        response = self.client.get("/vendors/2147483647")
        self.assertEqual(response.status_code, 404)

    def test_missing_menu_item_returns_404(self):
        response = self.client.get("/menu-items/2147483647")
        self.assertEqual(response.status_code, 404)

    def test_menu_for_missing_vendor_returns_404(self):
        response = self.client.get("/vendors/2147483647/menu")
        self.assertEqual(response.status_code, 404)

    def test_inactive_vendor_is_not_returned_by_list(self):
        from app.models import Vendor

        with self.TestSession() as db:
            db.add(
                Vendor(
                    name="Inactive Test Vendor",
                    area="UMT, Johar Town",
                    is_active=False,
                )
            )
            db.commit()

        response = self.client.get("/vendors")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])


if __name__ == "__main__":
    unittest.main()

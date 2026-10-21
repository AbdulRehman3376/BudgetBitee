import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.main import app


class TestBudgetBiteAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_endpoint_returns_ok(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "status": "ok",
                "service": "BudgetBite API",
            },
        )

    def test_root_endpoint_returns_api_information(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["name"], "BudgetBite API")
        self.assertEqual(data["status"], "running")
        self.assertEqual(data["docs"], "/docs")
        self.assertEqual(data["health"], "/health")

    def test_openapi_documentation_is_available(self):
        response = self.client.get("/openapi.json")

        self.assertEqual(response.status_code, 200)
        self.assertIn("BudgetBite API", response.json()["info"]["title"])


    def test_vendor_list_endpoint_exists(self):
        response = self.client.get("/vendors")
        self.assertIn(response.status_code, (200, 500))

    def test_missing_vendor_returns_not_found(self):
        response = self.client.get("/vendors/2147483647")
        self.assertEqual(response.status_code, 404)

    def test_vendor_creation_rejects_empty_name(self):
        response = self.client.post(
            "/vendors",
            json={"name": ""},
        )
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()

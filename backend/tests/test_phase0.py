import os
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

class TestPhase0Foundation(unittest.TestCase):
    def test_required_directories_exist(self):
        paths = [
            "backend/app",
            "backend/tests",
            "frontend/src",
            "frontend/public",
            "docs",
            "data/db",
            "data/logs",
            "data/cache/pip",
            "data/tmp",
            "scripts",
        ]
        for relative in paths:
            with self.subTest(path=relative):
                self.assertTrue((ROOT / relative).is_dir())

    def test_required_documents_exist(self):
        paths = [
            ".gitignore",
            ".env.example",
            "README.md",
            "backend/requirements.txt",
            "docs/PROJECT_SCOPE.md",
            "docs/ARCHITECTURE.md",
            "docs/ROADMAP.md",
            "docs/DATA_POLICY.md",
        ]
        for relative in paths:
            with self.subTest(path=relative):
                self.assertTrue((ROOT / relative).is_file())

    def test_secrets_file_is_ignored(self):
        content = (ROOT / ".gitignore").read_text(encoding="utf-8")
        self.assertIn(".env", content)

    def test_database_path_is_inside_project(self):
        db_dir = (ROOT / "data" / "db").resolve()
        self.assertEqual(db_dir.parent.name, "data")
        self.assertTrue(db_dir.is_relative_to(ROOT.resolve()))

if __name__ == "__main__":
    unittest.main(verbosity=2)

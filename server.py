#!/usr/bin/env python3
"""NSQF practice exam server. Uses only Python's standard library."""

import json
import os
import secrets
import sqlite3
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
# Set DATABASE_PATH to a persistent disk location in production.
DATABASE = Path(os.environ.get("DATABASE_PATH", str(ROOT / "exam_results.db")))
ADMIN_TOKEN = os.environ.get("NSQF_ADMIN_TOKEN")


def database():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def initialise_database():
    with database() as connection:
        connection.execute(
            """CREATE TABLE IF NOT EXISTS attempts (
                id TEXT PRIMARY KEY,
                student_name TEXT NOT NULL,
                course TEXT NOT NULL,
                score INTEGER NOT NULL,
                total_questions INTEGER NOT NULL,
                correct_answers INTEGER NOT NULL,
                wrong_answers INTEGER NOT NULL,
                unanswered INTEGER NOT NULL,
                percentage INTEGER NOT NULL,
                passed INTEGER NOT NULL,
                started_at TEXT,
                completed_at TEXT NOT NULL
            )"""
        )


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, status, body):
        encoded = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length > 20_000:
            raise ValueError("Request is too large.")
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def is_admin(self):
        return bool(ADMIN_TOKEN) and secrets.compare_digest(
            self.headers.get("X-Admin-Token", ""), ADMIN_TOKEN
        )

    def do_POST(self):
        if urlparse(self.path).path != "/api/attempts":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        try:
            attempt = self.read_json()
            name = str(attempt.get("studentName", "")).strip()
            course = str(attempt.get("course", "")).strip()
            result = attempt.get("result", {})
            if not name or not course:
                raise ValueError("Student name and course are required.")
            if len(name) > 120 or course not in {"COAITA", "CAA", "FAIT"}:
                raise ValueError("Invalid student or course.")
            fields = ["score", "correct", "wrong", "unanswered", "percentage"]
            if any(not isinstance(result.get(field), int) for field in fields):
                raise ValueError("Invalid result.")
            total = int(attempt.get("totalQuestions", 0))
            if total < 1 or total > 100:
                raise ValueError("Invalid question count.")
            if result["correct"] + result["wrong"] + result["unanswered"] != total:
                raise ValueError("Result totals do not match.")
            attempt_id = secrets.token_urlsafe(12)
            completed_at = datetime.now(timezone.utc).isoformat()
            with database() as connection:
                connection.execute(
                    """INSERT INTO attempts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (attempt_id, name, course, result["score"], total, result["correct"],
                     result["wrong"], result["unanswered"], result["percentage"],
                     int(bool(result.get("passed"))), attempt.get("startedAt"), completed_at),
                )
            self.send_json(HTTPStatus.CREATED, {"id": attempt_id, "completedAt": completed_at})
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})

    def do_GET(self):
        if urlparse(self.path).path != "/api/admin/attempts":
            return super().do_GET()
        if not self.is_admin():
            self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Administrator access required."})
            return
        with database() as connection:
            attempts = [dict(row) for row in connection.execute(
                "SELECT * FROM attempts ORDER BY completed_at DESC"
            )]
        self.send_json(HTTPStatus.OK, {"attempts": attempts})


if __name__ == "__main__":
    initialise_database()
    port = int(os.environ.get("PORT", "8000"))
    print(f"NSQF exam server running at http://localhost:{port}")
    if not ADMIN_TOKEN:
        print("Set NSQF_ADMIN_TOKEN before sharing this application; the dashboard is disabled.")
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()

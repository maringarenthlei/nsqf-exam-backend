# NSQF Exam Backend

This keeps the existing practice-exam interface and stores finished exam attempts in SQLite.

## Run locally

Set a private dashboard token, then start the server:

```sh
NSQF_ADMIN_TOKEN='choose-a-long-random-secret' python3 server.py
```

Open `http://localhost:8000` for the exam and `http://localhost:8000/admin.html` for the results dashboard. The database is created automatically as `exam_results.db`.

## Deployment

GitHub Pages cannot run this server. Deploy this folder to a Python-capable host (for example Render, Railway, Fly.io, or a VPS), configure `NSQF_ADMIN_TOKEN` as a secret, and use persistent storage for `exam_results.db`.

On Render, attach a persistent disk and set `DATABASE_PATH` to a location on that disk, for example `/var/data/exam_results.db`. Without persistent storage, the results database can be lost when the service is restarted or redeployed.

This initial version records completed attempts. For an official exam, the next hardening step is to move question selection and answer scoring entirely to server-side endpoints.

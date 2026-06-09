# SOC Dashboard — ENIDH LEIC 2026

A Security Operations Center (SOC) web portal built for 3rd year final project "Real Time Malware Lab", providing a centralized hub for infrastructure monitoring tools and a CAPEv2 malware analysis dashboard.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technologies](#technologies)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Workflow](#workflow)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Clone the Repository](#clone-the-repository)
  - [Run with Docker Compose](#run-with-docker-compose)
  - [Run Locally (without Docker)](#run-locally-without-docker)
- [API Reference](#api-reference)
- [Configuration](#configuration)

---

## Overview

The SOC Dashboard is an internal web portal that aggregates key security tools and presents CAPEv2 malware analysis reports in a clean, filterable interface. It is designed to run inside a Proxmox-hosted LXC container on the internal network.

---

## Features

- **Main Portal (`index.html`)** — Tile-based launcher linking to Proxmox, Wazuh Manager, the CAPE Dashboard, and Auxiliary Modules.
- **CAPE Dashboard (`dashboard.html`)** — Displays stored CAPEv2 JSON reports with risk scoring, filtering, pagination, and the ability to upload new reports.
- **Auxiliary Modules (`aux_mod.html`)** — Utility tools and documentation (e.g. log converter).
- **Auto-refresh** — Dashboard polls for new data every 5 minutes.
- **File Upload** — Analysts can push new `.json` report files directly from the browser.
- **Risk Categorisation** — Reports are automatically classified as High Risk (score ≥ 7), Suspicious (score 4–6), or Low Risk (score < 4).

---

## Technologies

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js 20, Express 5 |
| File Uploads | Multer |
| Reverse Proxy | Nginx |
| Containerisation | Docker, Docker Compose |
| Infrastructure | Proxmox VE (LXC container) |
| Version Control | Git / GitHub |
| Fonts | Google Fonts (Inter) |

---

## Architecture

```
Proxmox Host
│
└── Debian 12 LXC Container  (soc-menu)
    │
    ├── Docker Compose
    │   │
    │   ├── soc-menu  (nginx container)
    │   │   ├── Serves static frontend files
    │   │   └── Proxies /api/* → soc-backend:3000
    │   │
    │   └── soc-backend  (Node.js/Express container)
    │       ├── GET  /api/analyses  → reads JSON files from /Private
    │       └── POST /api/upload    → saves new JSON reports to /Private
    │
    └── /opt/soc-menu  (Git repository, mounted into containers)
```

Both containers share the same internal Docker network (`soc-network`). The backend is never exposed to the host — all traffic reaches it through the Nginx reverse proxy.

---

## Project Structure

```
Soc_Dashboard/
│
├── docker/
│   ├── compose.yml             # Docker Compose service definitions
│   └── nginx/
│       └── default.conf        # Nginx reverse proxy configuration
│
├── soc_backend/
│   ├── Dockerfile              # Node.js 20 Alpine image
│   ├── package.json            # Dependencies: express, multer, cors
│   ├── server.js               # Express API server
│   └── Private/                # JSON report storage (database)
│       └── <id>_report.json
│
└── soc_frontend/
    ├── index.html              # Main portal / module launcher
    ├── dashboard.html          # CAPEv2 analysis dashboard
    ├── aux_mod.html            # Auxiliary modules page
    ├── Scripts/
    │   └── dashboard.js        # Dashboard logic (fetch, filter, render, upload)
    ├── Styles/
    │   ├── main_style.css      # Main portal styles
    │   └── dashboard.css       # Dashboard styles
    ├── Images/                 # Logos and icons
    └── Files/                  # Downloadable agent installers and scripts
        ├── wazuh_agent.sh
        ├── wazuh_agent.bat
        ├── linux_per.sh
        └── power_shell.bat
```

---

## Workflow

```
Developer Machine
    │
    ├── Edit files locally
    ├── git add .
    ├── git commit -m "message"
    └── git push
              │
              ▼
        GitHub Repository
              │
              └── (SSH into LXC) git pull
                        │
                        ▼
              /opt/soc-menu  (on LXC)
                        │
                        ▼
              Docker Compose (auto-mounts directory)
                        │
                        ▼
              soc-menu nginx container serves updated files
```

Because the frontend directory is mounted as a read-only volume into the Nginx container, a `git pull` on the host is all that is needed to deploy changes — no container restart required.

---

## Getting Started

### Prerequisites

- [Git](https://git-scm.com/)
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/)
- Node.js 20+ (only needed for local development without Docker)

### Clone the Repository

```bash
git clone https://github.com/DNC2004/Soc_Dashboard.git
cd Soc_Dashboard
```

### Run with Docker Compose

```bash
cd docker
docker compose up -d
```

The portal will be available at `http://localhost`.

To stop the services:

```bash
docker compose down
```

To view logs:

```bash
docker compose logs -f
```

### Run Locally (without Docker)

**Backend:**

```bash
cd soc_backend
npm install
node server.js
# API available at http://localhost:3000
```

**Frontend:**

Serve the `soc_frontend` directory with any static file server, for example:

```bash
npx serve soc_frontend -l 8080
# Site available at http://localhost:8080
```

> Note: when running locally, the frontend's `/api/` calls need to reach the backend on port 3000. Either configure a local proxy or temporarily update the fetch URL in `dashboard.js`.

---

## API Reference

The backend exposes two endpoints, both proxied through Nginx at `/api/`.

### `GET /api/analyses`

Returns an array of all CAPEv2 JSON reports stored in `soc_backend/Private/`.

**Response:** `200 OK` — JSON array of report objects.

```json
[
  {
    "info": { "id": 37, "score": 8.5, "started": "2026-06-02T12:05:00Z" },
    "target": { "file": { "name": "malware.exe", "sha256": "abc123..." } },
    "signatures": [ ... ]
  }
]
```

### `POST /api/upload`

Uploads a new `.json` report file to `soc_backend/Private/`.

**Request:** `multipart/form-data` with a `file` field.

**Response:** `200 OK`

```json
{ "success": true }
```

---

## Configuration

### Nginx (`docker/nginx/default.conf`)

- Listens on port 80.
- Serves static files from `/usr/share/nginx/html` (mapped to `soc_frontend/`).
- Proxies all `/api/*` requests to `soc-backend:3000`.
- `client_max_body_size` is set to **50 MB** to accommodate large report uploads.

### Docker Compose (`docker/compose.yml`)

| Service | Image | Port | Volume |
|---|---|---|---|
| `soc-menu` | nginx | 80:80 | `soc_frontend/` → `/usr/share/nginx/html` (read-only) |
| `soc-backend` | Node.js 20 Alpine (built locally) | internal only | `soc_backend/Private/` → `/app/Private` |

Both services communicate over the internal `soc-network` bridge network.

---

*ENIDH — LEIC 2026 — 3rd Year Final Project*

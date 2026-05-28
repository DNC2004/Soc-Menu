# SOC Dashboard Structure

```text
Proxmox Host
│
└── Debian 12 LXC Container (soc-menu)
    │
    ├── Docker
    │   │
    │   └── nginx Container
    │       │
    │       └── Serves Website Files
    │
    ├── Git Repository
    │   │
    │   └── /opt/soc-menu
    │       
    └── SSH Server
        │
        └── Allows Git / SCP / Remote Access
```

---

# Workflow Structure

```text
Your Computer
    │
    ├── Edit Website Files
    │
    ├── git add .
    ├── git commit
    └── git push
            │
            ▼
GitHub Repository
            │
            └── git pull
                    │
                    ▼
/opt/soc-menu (inside LXC)
                    │
                    ▼
Docker nginx Container
                    │
                    ▼
SOC Dashboard Website
```

---

# Docker Structure

```text
Docker Container
│
└── nginx
    │
    └── /usr/share/nginx/html
            ▲
            │
            └── Mounted From:
                /opt/soc-menu
```

Docker Command:

```bash
docker run -d \
  --name soc-menu \
  --restart unless-stopped \
  -p 80:80 \
  -v /opt/soc-menu:/usr/share/nginx/html:ro \
  nginx
```

---

# Website Structure

```text
soc-menu/
│
├── index.html
├── aux_mod.html
├── txt_converter.html
│
├── Images/
│   
├── Styles/
│    └── main_style.css
│    └── txt-to-pdf.css
│
├── Scripts/
│    └── txt-to-pdf.js
│
└── Files/
    
```

---

# Main Page Ui
<img width="1920" height="1032" alt="image" src="https://github.com/user-attachments/assets/83cace12-edbf-4206-96ef-decbf846d400" />

---

# Auxialiary Modules Ui
<img width="1920" height="1032" alt="Captura de ecrã 2026-05-28 193119" src="https://github.com/user-attachments/assets/233e2e7a-1f14-40c6-a7d8-e916812ba867" />

---

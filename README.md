# Orchestration Workspace

A self-hosted orchestration platform that launches, links, and presents containerized tools as resizable tiled panels in one unified dashboard. Manage multiple services like DuckDB, MinIO, n8n, Temporal, and more through a modern, intuitive interface.

## 🚀 Features

### Core Capabilities
- **Unified Dashboard**: Manage all containerized services from a single, beautiful interface
- **Resizable Grid Layout**: Drag, drop, and resize service panels to customize your workspace
- **Real-time Monitoring**: Live container status, CPU usage, memory metrics, and logs
- **Service Management**: Start, stop, restart containers with one click
- **Add Custom Services**: Deploy any Docker container through an intuitive form
- **Layout Persistence**: Save and restore your preferred dashboard layouts
- **WebSocket Updates**: Real-time status updates across all services

### Included Services

#### Core Services (Pre-configured)
- **DuckDB**: In-process analytical database
- **MinIO**: S3-compatible object storage
- **n8n**: Workflow automation tool
- **Temporal**: Workflow orchestration engine
- **DBeaver CE**: Web-based database management
- **VS Code Server**: Browser-based VS Code editor
- **Electerm**: Terminal/SSH client
- **Rclone**: Cloud storage sync utility
- **Grist**: Collaborative spreadsheet/database
- **Amphi**: Visual ETL builder

#### Optional Services
- **Grafana & Prometheus**: Monitoring and metrics
- **Traefik**: Reverse proxy and load balancer
- **Portainer**: Container management UI
- **PostgreSQL**: Relational database
- **Redis**: In-memory cache
- **RabbitMQ**: Message broker
- **Keycloak**: Identity and access management
- **Nextcloud**: File sharing platform
- **Vault**: Secrets management

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard  │  │   Sidebar    │  │    Modals    │      │
│  │  Grid Layout│  │   Services   │  │  Add/Details │      │
│  └─────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ REST API + WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Service    │  │   Docker     │  │  WebSocket   │      │
│  │  Registry   │  │   Manager    │  │   Handler    │      │
│  └─────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
            ┌──────────────┐  ┌──────────────┐
            │   MySQL      │  │   Docker     │
            │   Metadata   │  │   Engine     │
            └──────────────┘  └──────────────┘
```

## 📦 Technology Stack

### Frontend
- **React 19**: Modern UI framework
- **react-grid-layout**: Draggable and resizable grid
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn UI**: High-quality component library
- **Axios**: HTTP client
- **Sonner**: Toast notifications
- **Lucide React**: Icon library

### Backend
- **FastAPI**: High-performance Python API framework
- **Docker SDK**: Container management
- **aiomysql**: Async MySQL driver
- **WebSockets**: Real-time communication
- **Pydantic**: Data validation

### Database
- **MySQL 8.0**: Metadata storage for services, layouts, and configurations

**Note**: This project uses **MySQL ONLY**. No MongoDB is required or used.

## 🛠️ Installation

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ and Yarn
- Python 3.11+
- MySQL 8.0

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd orchestration-workspace
```

2. **Install MySQL**
```bash
# On Ubuntu/Debian
sudo apt-get install mysql-server

# Start MySQL
sudo service mysql start

# Create database
mysql -e "CREATE DATABASE orchestration_db;"
```

3. **Backend Setup**
```bash
cd backend
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MySQL credentials

# Start backend
uvicorn server:app --host 0.0.0.0 --port 8001
```

4. **Frontend Setup**
```bash
cd frontend
yarn install

# Configure environment
cp .env.example .env
# Edit .env with backend URL

# Start frontend
yarn start
```

5. **Access the Dashboard**
Open your browser to `http://localhost:3000`

## 🎯 Usage

### Dashboard Overview
The main dashboard displays all enabled services as resizable cards in a grid layout. Each service card shows:
- Service name, icon, and category
- Current status (running, stopped, exited)
- Real-time CPU and memory usage (for running containers)
- Exposed ports
- Quick action buttons (Start/Stop/Restart)

### Managing Services

#### Enable/Disable Services
1. Hover over the left sidebar to expand it
2. Toggle services on/off using the switches
3. Enabled services appear on the dashboard immediately

#### Start a Container
1. Find the service card on the dashboard
2. Click the green "Start" button
3. Monitor the status indicator (changes to green when running)

#### View Service Details
1. Click on any service card
2. View tabs: Overview, Logs, Stats
3. Access container logs, environment variables, and performance metrics

#### Add a New Service
1. Click the "+" button in the sidebar
2. Fill in the form:
   - Service name and category
   - Docker image and tag
   - Description
   - Port mappings (e.g., `8080:80`)
   - Environment variables
   - Volume mounts
3. Click "Add Service"
4. Enable and start the new service

### Layout Management
- **Resize Panels**: Drag the bottom-right corner of any service card
- **Rearrange**: Drag service cards to reposition them
- **Save Layout**: Click "Save Layout" button to persist your arrangement
- **Refresh**: Click "Refresh" to update all service statuses

## 🔌 API Reference

### Services
- `GET /api/services` - List all services
- `POST /api/services` - Add a new service
- `PATCH /api/services/{id}/enable?enabled=true` - Enable/disable a service

### Containers
- `POST /api/containers/{id}/start` - Start a container
- `POST /api/containers/{id}/stop` - Stop a container
- `POST /api/containers/{id}/restart` - Restart a container
- `GET /api/containers/{id}/logs?tail=100` - Get container logs
- `GET /api/containers/{id}/stats` - Get container resource stats

### Layouts
- `GET /api/layouts` - List saved layouts
- `POST /api/layouts` - Save a new layout

### WebSocket
- `WS /api/ws` - Real-time status updates

## 🎨 Design System

The workspace uses a modern dark glassmorphism theme with:
- **Primary Color**: Cyan (#06b6d4)
- **Background**: Dark zinc (#09090b)
- **Typography**: Manrope for headings, JetBrains Mono for code
- **Effects**: Backdrop blur, subtle glows, smooth transitions

## 🔒 Security Considerations

**Current Status**: Authentication is disabled by default for quick setup.

**For Production**:
1. Enable authentication (Keycloak integration available)
2. Secure WebSocket connections with tokens
3. Implement RBAC for service management
4. Use Docker socket over TLS
5. Set up secrets management with Vault

## 🐳 Docker Note

The current implementation requires Docker to be available on the host system. For Docker-in-Docker scenarios:
- Mount Docker socket: `/var/run/docker.sock:/var/run/docker.sock`
- Or configure remote Docker daemon connection

## 📊 Database Schema

### services
- `id`: Unique service identifier
- `name`: Display name
- `category`: Service category (database, storage, tool, etc.)
- `image`, `tag`: Docker image information
- `ports`, `env_vars`, `volumes`: JSON configuration
- `enabled`: Whether service appears on dashboard

### containers
- Container runtime information
- Links to service definitions
- Tracks start/stop times

### layouts
- Saved dashboard configurations
- Grid position and size data

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Additional service templates
- Advanced networking (service mesh)
- Resource limits and quotas
- Multi-host orchestration
- Kubernetes backend support

## 📝 License

MIT License

## 🙏 Acknowledgments

Built with:
- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Docker](https://www.docker.com/)
- [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout)

---

**Made with Emergent** 🚀

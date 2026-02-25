# Quick Start Guide - Orchestration Workspace

## Prerequisites

- **MySQL 8.0** (NOT MongoDB)
- **Node.js 18+** and **Yarn**
- **Python 3.11+**
- **Docker** (optional, for running actual containers)

## Installation Steps

### 1. Database Setup (MySQL)

```bash
# Install MySQL
sudo apt-get install default-mysql-server  # Ubuntu/Debian
brew install mysql                         # macOS

# Start MySQL
sudo service mysql start  # Linux
brew services start mysql # macOS

# Create database
mysql -u root -p
CREATE DATABASE orchestration_db;
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'rootpass';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Backend Setup

```bash
cd backend

# Copy environment file
cp .env.example .env

# Edit .env with your MySQL credentials (if different from defaults)
# MYSQL_HOST=localhost
# MYSQL_PORT=3306
# MYSQL_USER=root
# MYSQL_PASSWORD=rootpass
# MYSQL_DATABASE=orchestration_db

# Install dependencies
pip install -r requirements.txt

# Start backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Backend will be available at http://localhost:8001

### 3. Frontend Setup

```bash
cd frontend

# Copy environment file
cp .env.example .env

# Edit .env if needed
# REACT_APP_BACKEND_URL=http://localhost:8001

# Install dependencies
yarn install

# Start frontend
yarn start
```

Frontend will be available at http://localhost:3000

### 4. Docker Setup (Optional - for running containers)

If you want to actually start containers (not just use demo UIs):

```bash
# Ensure Docker is installed and running
docker --version

# The application needs access to Docker socket
# When running in production, mount the socket:
docker run -v /var/run/docker.sock:/var/run/docker.sock ...
```

## Quick Test

1. Open http://localhost:3000
2. You should see 10 services in a tiled grid
3. Use the search bar to find services
4. Click the maximize icon to fullscreen any service
5. Click info icon to see logs and stats

## Environment Variables

### Backend (.env)
- `MYSQL_HOST` - MySQL server host (default: localhost)
- `MYSQL_PORT` - MySQL server port (default: 3306)
- `MYSQL_USER` - MySQL username (default: root)
- `MYSQL_PASSWORD` - MySQL password (default: rootpass)
- `MYSQL_DATABASE` - Database name (default: orchestration_db)
- `CORS_ORIGINS` - Allowed origins (default: *)

### Frontend (.env)
- `REACT_APP_BACKEND_URL` - Backend API URL (default: http://localhost:8001)
- `WDS_SOCKET_PORT` - WebSocket port for development (default: 443)
- `ENABLE_HEALTH_CHECK` - Enable health checks (default: false)

## Production Deployment

For production:

1. Set strong MySQL password
2. Configure CORS_ORIGINS properly
3. Use HTTPS for frontend
4. Mount Docker socket securely
5. Set up proper authentication (Keycloak service included)

## Troubleshooting

### Backend won't start
```bash
# Check MySQL is running
sudo service mysql status

# Test MySQL connection
mysql -u root -p -e "SELECT 1;"

# Check backend logs
tail -f /var/log/supervisor/backend.err.log
```

### Frontend won't connect to backend
```bash
# Verify backend is running
curl http://localhost:8001/api/services

# Check REACT_APP_BACKEND_URL in frontend/.env
cat frontend/.env
```

### Services show "stopped" status
This is expected if Docker is not available. Services will show demo UIs instead.

To enable real containers:
1. Install Docker
2. Start Docker daemon
3. Ensure backend can access Docker socket

## Database Information

**Important**: This project uses **MySQL 8.0 ONLY**
- ✅ MySQL for all metadata storage
- ❌ No MongoDB required or used
- ❌ No MongoDB packages in requirements.txt

All service definitions, container states, and layouts are stored in MySQL.

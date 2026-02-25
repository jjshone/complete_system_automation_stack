# Orchestration Workspace Environment Configuration

This project uses MySQL for metadata storage (NOT MongoDB).

## Backend Configuration

Copy `backend/.env.example` to `backend/.env` and configure:

```bash
cd backend
cp .env.example .env
```

### MySQL Setup

1. Install MySQL 8.0:
```bash
# Ubuntu/Debian
sudo apt-get install default-mysql-server

# macOS
brew install mysql

# Start MySQL
sudo service mysql start  # Linux
brew services start mysql # macOS
```

2. Create database:
```bash
mysql -u root -p
CREATE DATABASE orchestration_db;
exit
```

3. Update backend/.env with your MySQL credentials

## Frontend Configuration

Copy `frontend/.env.example` to `frontend/.env`:

```bash
cd frontend
cp .env.example .env
```

Update `REACT_APP_BACKEND_URL` if your backend runs on a different host/port.

## Docker Configuration (for running actual containers)

To enable actual container management:

1. Ensure Docker is installed and running
2. Mount Docker socket when running:
   ```bash
   docker run -v /var/run/docker.sock:/var/run/docker.sock ...
   ```

## Database: MySQL Only

**Important**: This project uses **MySQL 8.0** for all metadata storage.
- Service definitions
- Container states
- Layout configurations
- User preferences

**No MongoDB** is used or required.

## Quick Start

```bash
# Backend
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001

# Frontend (new terminal)
cd frontend
cp .env.example .env
yarn install
yarn start
```

Access the workspace at http://localhost:3000
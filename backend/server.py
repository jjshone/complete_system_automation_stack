from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import logging
import json
import asyncio
import aiomysql
import docker
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()
api_router = APIRouter(prefix="/api")

db_pool = None
docker_client = None
active_connections: List[WebSocket] = []

async def init_mysql():
    global db_pool
    try:
        db_pool = await aiomysql.create_pool(
            host=os.environ.get('MYSQL_HOST', 'localhost'),
            port=int(os.environ.get('MYSQL_PORT', 3306)),
            user=os.environ.get('MYSQL_USER', 'root'),
            password=os.environ.get('MYSQL_PASSWORD', 'rootpass'),
            db=os.environ.get('MYSQL_DATABASE', 'orchestration_db'),
            autocommit=True,
            maxsize=10
        )
        logger.info("MySQL pool created successfully")
        
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cursor:
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS services (
                        id VARCHAR(100) PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        category VARCHAR(50) NOT NULL,
                        image VARCHAR(255) NOT NULL,
                        tag VARCHAR(50) DEFAULT 'latest',
                        description TEXT,
                        ports JSON,
                        env_vars JSON,
                        volumes JSON,
                        health_check VARCHAR(255),
                        enabled BOOLEAN DEFAULT FALSE,
                        icon VARCHAR(50),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS containers (
                        id VARCHAR(100) PRIMARY KEY,
                        service_id VARCHAR(100) NOT NULL,
                        container_id VARCHAR(255),
                        status VARCHAR(50),
                        started_at TIMESTAMP,
                        stopped_at TIMESTAMP,
                        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
                    )
                """)
                
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS layouts (
                        id VARCHAR(100) PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        layout_data JSON NOT NULL,
                        is_default BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                logger.info("Database tables created/verified")
                
                await cursor.execute("SELECT COUNT(*) FROM services")
                result = await cursor.fetchone()
                if result[0] == 0:
                    await seed_services(cursor)
                    
    except Exception as e:
        logger.error(f"MySQL initialization error: {e}")
        raise

async def seed_services(cursor):
    core_services = [
        {
            "id": "duckdb",
            "name": "DuckDB",
            "category": "database",
            "image": "datacatering/duckdb",
            "tag": "latest",
            "description": "In-process analytical database",
            "ports": json.dumps(["8080:8080"]),
            "env_vars": json.dumps({}),
            "volumes": json.dumps(["duckdb-data:/data"]),
            "health_check": "/health",
            "enabled": 1,
            "icon": "Database"
        },
        {
            "id": "minio",
            "name": "MinIO",
            "category": "storage",
            "image": "minio/minio",
            "tag": "latest",
            "description": "S3-compatible object storage",
            "ports": json.dumps(["9000:9000", "9001:9001"]),
            "env_vars": json.dumps({"MINIO_ROOT_USER": "admin", "MINIO_ROOT_PASSWORD": "adminpass123"}),
            "volumes": json.dumps(["minio-data:/data"]),
            "health_check": "/minio/health/live",
            "enabled": 1,
            "icon": "HardDrive"
        },
        {
            "id": "n8n",
            "name": "n8n",
            "category": "automation",
            "image": "n8nio/n8n",
            "tag": "latest",
            "description": "Workflow automation tool",
            "ports": json.dumps(["5678:5678"]),
            "env_vars": json.dumps({"N8N_BASIC_AUTH_ACTIVE": "false"}),
            "volumes": json.dumps(["n8n-data:/home/node/.n8n"]),
            "health_check": "/healthz",
            "enabled": 1,
            "icon": "Workflow"
        },
        {
            "id": "temporal",
            "name": "Temporal",
            "category": "orchestration",
            "image": "temporalio/auto-setup",
            "tag": "latest",
            "description": "Workflow orchestration engine",
            "ports": json.dumps(["7233:7233", "8088:8088"]),
            "env_vars": json.dumps({}),
            "volumes": json.dumps(["temporal-data:/etc/temporal"]),
            "health_check": "/",
            "enabled": 1,
            "icon": "GitBranch"
        },
        {
            "id": "dbeaver",
            "name": "DBeaver CE",
            "category": "tool",
            "image": "dbeaver/cloudbeaver",
            "tag": "latest",
            "description": "Web-based database management",
            "ports": json.dumps(["8978:8978"]),
            "env_vars": json.dumps({}),
            "volumes": json.dumps(["dbeaver-data:/opt/cloudbeaver/workspace"]),
            "health_check": "/",
            "enabled": 1,
            "icon": "Database"
        },
        {
            "id": "code-server",
            "name": "VS Code Server",
            "category": "tool",
            "image": "codercom/code-server",
            "tag": "latest",
            "description": "VS Code in the browser",
            "ports": json.dumps(["8443:8080"]),
            "env_vars": json.dumps({"PASSWORD": "admin123"}),
            "volumes": json.dumps(["code-server-data:/home/coder"]),
            "health_check": "/healthz",
            "enabled": 1,
            "icon": "Code"
        },
        {
            "id": "electerm",
            "name": "Electerm",
            "category": "tool",
            "image": "electerm/electerm-web",
            "tag": "latest",
            "description": "Terminal/SSH client",
            "ports": json.dumps(["3456:3000"]),
            "env_vars": json.dumps({}),
            "volumes": json.dumps(["electerm-data:/root/.electerm"]),
            "health_check": "/",
            "enabled": 1,
            "icon": "Terminal"
        },
        {
            "id": "rclone",
            "name": "Rclone",
            "category": "storage",
            "image": "rclone/rclone",
            "tag": "latest",
            "description": "Cloud storage sync",
            "ports": json.dumps(["5572:5572"]),
            "env_vars": json.dumps({}),
            "volumes": json.dumps(["rclone-config:/config/rclone", "rclone-data:/data"]),
            "health_check": "/",
            "enabled": 1,
            "icon": "Cloud"
        },
        {
            "id": "grist",
            "name": "Grist",
            "category": "data",
            "image": "gristlabs/grist",
            "tag": "latest",
            "description": "Collaborative spreadsheet/database",
            "ports": json.dumps(["8484:8484"]),
            "env_vars": json.dumps({}),
            "volumes": json.dumps(["grist-data:/persist"]),
            "health_check": "/status",
            "enabled": 1,
            "icon": "Table"
        },
        {
            "id": "amphi",
            "name": "Amphi",
            "category": "etl",
            "image": "amphi/amphi-etl",
            "tag": "latest",
            "description": "Visual ETL builder",
            "ports": json.dumps(["3001:3000"]),
            "env_vars": json.dumps({}),
            "volumes": json.dumps(["amphi-data:/app/data"]),
            "health_check": "/health",
            "enabled": 1,
            "icon": "BarChart3"
        }
    ]
    
    optional_services = [
        {
            "id": "grafana",
            "name": "Grafana",
            "category": "monitoring",
            "image": "grafana/grafana",
            "tag": "latest",
            "description": "Monitoring dashboards",
            "ports": json.dumps(["3030:3000"]),
            "env_vars": json.dumps({"GF_SECURITY_ADMIN_PASSWORD": "admin"}),
            "volumes": json.dumps(["grafana-data:/var/lib/grafana"]),
            "health_check": "/api/health",
            "enabled": 0,
            "icon": "LineChart"
        },
        {
            "id": "prometheus",
            "name": "Prometheus",
            "category": "monitoring",
            "image": "prom/prometheus",
            "tag": "latest",
            "description": "Metrics collection",
            "ports": json.dumps(["9090:9090"]),
            "env_vars": json.dumps({}),
            "volumes": json.dumps(["prometheus-data:/prometheus"]),
            "health_check": "/-/healthy",
            "enabled": 0,
            "icon": "Activity"
        },
        {
            "id": "traefik",
            "name": "Traefik",
            "category": "routing",
            "image": "traefik",
            "tag": "latest",
            "description": "Reverse proxy",
            "ports": json.dumps(["8081:8080", "8082:80"]),
            "env_vars": json.dumps({}),
            "volumes": json.dumps(["/var/run/docker.sock:/var/run/docker.sock"]),
            "health_check": "/ping",
            "enabled": 0,
            "icon": "Network"
        },
        {
            "id": "portainer",
            "name": "Portainer",
            "category": "management",
            "image": "portainer/portainer-ce",
            "tag": "latest",
            "description": "Container management UI",
            "ports": json.dumps(["9443:9443", "8000:8000"]),
            "env_vars": json.dumps({}),
            "volumes": json.dumps(["portainer-data:/data", "/var/run/docker.sock:/var/run/docker.sock"]),
            "health_check": "/api/status",
            "enabled": 0,
            "icon": "Container"
        },
        {
            "id": "postgresql",
            "name": "PostgreSQL",
            "category": "database",
            "image": "postgres",
            "tag": "15",
            "description": "Relational database",
            "ports": json.dumps(["5432:5432"]),
            "env_vars": json.dumps({"POSTGRES_PASSWORD": "postgres", "POSTGRES_USER": "postgres"}),
            "volumes": json.dumps(["postgres-data:/var/lib/postgresql/data"]),
            "health_check": "/",
            "enabled": 0,
            "icon": "Database"
        },
        {
            "id": "redis",
            "name": "Redis",
            "category": "cache",
            "image": "redis",
            "tag": "7",
            "description": "In-memory data store",
            "ports": json.dumps(["6379:6379"]),
            "env_vars": json.dumps({}),
            "volumes": json.dumps(["redis-data:/data"]),
            "health_check": "/",
            "enabled": 0,
            "icon": "Zap"
        },
        {
            "id": "rabbitmq",
            "name": "RabbitMQ",
            "category": "messaging",
            "image": "rabbitmq",
            "tag": "3-management",
            "description": "Message broker",
            "ports": json.dumps(["5672:5672", "15672:15672"]),
            "env_vars": json.dumps({"RABBITMQ_DEFAULT_USER": "admin", "RABBITMQ_DEFAULT_PASS": "admin"}),
            "volumes": json.dumps(["rabbitmq-data:/var/lib/rabbitmq"]),
            "health_check": "/api/health/checks/alarms",
            "enabled": 0,
            "icon": "MessageSquare"
        },
        {
            "id": "keycloak",
            "name": "Keycloak",
            "category": "auth",
            "image": "quay.io/keycloak/keycloak",
            "tag": "latest",
            "description": "Identity and access management",
            "ports": json.dumps(["8180:8080"]),
            "env_vars": json.dumps({"KEYCLOAK_ADMIN": "admin", "KEYCLOAK_ADMIN_PASSWORD": "admin"}),
            "volumes": json.dumps(["keycloak-data:/opt/keycloak/data"]),
            "health_check": "/health",
            "enabled": 0,
            "icon": "Lock"
        },
        {
            "id": "nextcloud",
            "name": "Nextcloud",
            "category": "storage",
            "image": "nextcloud",
            "tag": "latest",
            "description": "File sharing platform",
            "ports": json.dumps(["8081:80"]),
            "env_vars": json.dumps({}),
            "volumes": json.dumps(["nextcloud-data:/var/www/html"]),
            "health_check": "/status.php",
            "enabled": 0,
            "icon": "FolderOpen"
        },
        {
            "id": "vault",
            "name": "Vault",
            "category": "security",
            "image": "vault",
            "tag": "latest",
            "description": "Secrets management",
            "ports": json.dumps(["8200:8200"]),
            "env_vars": json.dumps({"VAULT_DEV_ROOT_TOKEN_ID": "root"}),
            "volumes": json.dumps(["vault-data:/vault/file"]),
            "health_check": "/v1/sys/health",
            "enabled": 0,
            "icon": "Shield"
        }
    ]
    
    all_services = core_services + optional_services
    
    for service in all_services:
        await cursor.execute(
            """INSERT INTO services (id, name, category, image, tag, description, ports, env_vars, 
               volumes, health_check, enabled, icon) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (service['id'], service['name'], service['category'], service['image'], service['tag'],
             service['description'], service['ports'], service['env_vars'], service['volumes'],
             service['health_check'], service['enabled'], service['icon'])
        )
    
    logger.info(f"Seeded {len(all_services)} services")

class Service(BaseModel):
    id: str
    name: str
    category: str
    image: str
    tag: str = "latest"
    description: Optional[str] = None
    ports: List[str] = []
    env_vars: Dict[str, str] = {}
    volumes: List[str] = []
    health_check: Optional[str] = None
    enabled: bool = False
    icon: str = "Box"
    status: Optional[str] = "unknown"
    container_id: Optional[str] = None

class ServiceCreate(BaseModel):
    name: str
    category: str
    image: str
    tag: str = "latest"
    description: Optional[str] = None
    ports: List[str] = []
    env_vars: Dict[str, str] = {}
    volumes: List[str] = []
    health_check: Optional[str] = None
    icon: str = "Box"

class Layout(BaseModel):
    id: str
    name: str
    layout_data: List[Dict[str, Any]]
    is_default: bool = False

class LayoutCreate(BaseModel):
    name: str
    layout_data: List[Dict[str, Any]]
    is_default: bool = False

class ContainerAction(BaseModel):
    action: str

@api_router.get("/services", response_model=List[Service])
async def get_services():
    async with db_pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute("SELECT * FROM services")
            services = await cursor.fetchall()
            
            result = []
            for svc in services:
                svc_dict = dict(svc)
                svc_dict['ports'] = json.loads(svc_dict['ports']) if svc_dict['ports'] else []
                svc_dict['env_vars'] = json.loads(svc_dict['env_vars']) if svc_dict['env_vars'] else {}
                svc_dict['volumes'] = json.loads(svc_dict['volumes']) if svc_dict['volumes'] else []
                svc_dict['enabled'] = bool(svc_dict['enabled'])
                
                status = await get_container_status(svc_dict['id'])
                svc_dict['status'] = status['status']
                svc_dict['container_id'] = status.get('container_id')
                
                result.append(svc_dict)
            
            return result

@api_router.post("/services", response_model=Service)
async def create_service(service: ServiceCreate):
    service_id = service.name.lower().replace(' ', '-')
    
    async with db_pool.acquire() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute(
                """INSERT INTO services (id, name, category, image, tag, description, ports, env_vars, 
                   volumes, health_check, enabled, icon) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (service_id, service.name, service.category, service.image, service.tag,
                 service.description, json.dumps(service.ports), json.dumps(service.env_vars),
                 json.dumps(service.volumes), service.health_check, False, service.icon)
            )
    
    return Service(id=service_id, **service.dict(), status="stopped")

@api_router.patch("/services/{service_id}/enable")
async def toggle_service(service_id: str, enabled: bool):
    async with db_pool.acquire() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute(
                "UPDATE services SET enabled = %s WHERE id = %s",
                (enabled, service_id)
            )
    
    await broadcast_message({"type": "service_updated", "service_id": service_id, "enabled": enabled})
    return {"message": "Service updated", "service_id": service_id, "enabled": enabled}

@api_router.post("/containers/{service_id}/start")
async def start_container(service_id: str):
    try:
        try:
            client = docker.from_env()
        except Exception as docker_error:
            logger.warning(f"Docker not available: {docker_error}")
            raise HTTPException(status_code=503, detail="Docker service not available. This demo requires Docker to be running.")
        
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cursor:
                await cursor.execute("SELECT * FROM services WHERE id = %s", (service_id,))
                service = await cursor.fetchone()
                
                if not service:
                    raise HTTPException(status_code=404, detail="Service not found")
                
                ports_dict = {}
                ports = json.loads(service['ports']) if service['ports'] else []
                for port_mapping in ports:
                    if ':' in port_mapping:
                        host_port, container_port = port_mapping.split(':')
                        ports_dict[container_port] = host_port
                
                env_vars = json.loads(service['env_vars']) if service['env_vars'] else {}
                volumes_list = json.loads(service['volumes']) if service['volumes'] else []
                volumes_dict = {vol.split(':')[0]: {'bind': vol.split(':')[1], 'mode': 'rw'} for vol in volumes_list if ':' in vol}
                
                container = client.containers.run(
                    f"{service['image']}:{service['tag']}",
                    detach=True,
                    name=f"orch_{service_id}",
                    ports=ports_dict,
                    environment=env_vars,
                    volumes=volumes_dict,
                    network_mode="bridge"
                )
                
                await cursor.execute(
                    """INSERT INTO containers (id, service_id, container_id, status, started_at) 
                       VALUES (%s, %s, %s, %s, %s) ON DUPLICATE KEY UPDATE 
                       container_id=%s, status=%s, started_at=%s""",
                    (service_id, service_id, container.id, 'running', datetime.now(),
                     container.id, 'running', datetime.now())
                )
        
        await broadcast_message({"type": "container_started", "service_id": service_id, "container_id": container.id})
        return {"message": "Container started", "container_id": container.id}
    
    except docker.errors.APIError as e:
        logger.error(f"Docker API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Error starting container: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/containers/{service_id}/stop")
async def stop_container(service_id: str):
    try:
        client = docker.from_env()
        container = client.containers.get(f"orch_{service_id}")
        container.stop()
        
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(
                    "UPDATE containers SET status = %s, stopped_at = %s WHERE service_id = %s",
                    ('stopped', datetime.now(), service_id)
                )
        
        await broadcast_message({"type": "container_stopped", "service_id": service_id})
        return {"message": "Container stopped", "service_id": service_id}
    
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except Exception as e:
        logger.error(f"Error stopping container: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/containers/{service_id}/restart")
async def restart_container(service_id: str):
    try:
        await stop_container(service_id)
        await asyncio.sleep(1)
        await start_container(service_id)
        return {"message": "Container restarted", "service_id": service_id}
    except Exception as e:
        logger.error(f"Error restarting container: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/containers/{service_id}/logs")
async def get_container_logs(service_id: str, tail: int = 100):
    try:
        client = docker.from_env()
        container = client.containers.get(f"orch_{service_id}")
        logs = container.logs(tail=tail).decode('utf-8')
        return {"logs": logs}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except Exception as e:
        logger.error(f"Error fetching logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/containers/{service_id}/stats")
async def get_container_stats(service_id: str):
    try:
        client = docker.from_env()
        container = client.containers.get(f"orch_{service_id}")
        stats = container.stats(stream=False)
        
        cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - stats['precpu_stats']['cpu_usage']['total_usage']
        system_delta = stats['cpu_stats']['system_cpu_usage'] - stats['precpu_stats']['system_cpu_usage']
        cpu_percent = (cpu_delta / system_delta) * 100.0 if system_delta > 0 else 0.0
        
        mem_usage = stats['memory_stats']['usage']
        mem_limit = stats['memory_stats']['limit']
        mem_percent = (mem_usage / mem_limit) * 100.0 if mem_limit > 0 else 0.0
        
        return {
            "cpu_percent": round(cpu_percent, 2),
            "memory_usage_mb": round(mem_usage / (1024 * 1024), 2),
            "memory_percent": round(mem_percent, 2)
        }
    except docker.errors.NotFound:
        return {"cpu_percent": 0, "memory_usage_mb": 0, "memory_percent": 0}
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        return {"cpu_percent": 0, "memory_usage_mb": 0, "memory_percent": 0}

async def get_container_status(service_id: str) -> Dict[str, Any]:
    try:
        client = docker.from_env()
        container = client.containers.get(f"orch_{service_id}")
        return {"status": container.status, "container_id": container.id}
    except docker.errors.NotFound:
        return {"status": "stopped", "container_id": None}
    except Exception:
        return {"status": "unknown", "container_id": None}

@api_router.get("/layouts", response_model=List[Layout])
async def get_layouts():
    async with db_pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute("SELECT * FROM layouts")
            layouts = await cursor.fetchall()
            
            result = []
            for layout in layouts:
                layout_dict = dict(layout)
                layout_dict['layout_data'] = json.loads(layout_dict['layout_data'])
                layout_dict['is_default'] = bool(layout_dict['is_default'])
                result.append(layout_dict)
            
            return result

@api_router.post("/layouts", response_model=Layout)
async def create_layout(layout: LayoutCreate):
    import uuid
    layout_id = str(uuid.uuid4())
    
    async with db_pool.acquire() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute(
                "INSERT INTO layouts (id, name, layout_data, is_default) VALUES (%s, %s, %s, %s)",
                (layout_id, layout.name, json.dumps(layout.layout_data), layout.is_default)
            )
    
    return Layout(id=layout_id, **layout.dict())

@api_router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"Received: {data}")
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        logger.info("Client disconnected")

async def broadcast_message(message: Dict[str, Any]):
    for connection in active_connections:
        try:
            await connection.send_json(message)
        except Exception as e:
            logger.error(f"Error broadcasting message: {e}")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await init_mysql()
    logger.info("Application started")

@app.on_event("shutdown")
async def shutdown():
    if db_pool:
        db_pool.close()
        await db_pool.wait_closed()
    logger.info("Application shutdown")
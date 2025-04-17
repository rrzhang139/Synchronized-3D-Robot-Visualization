import os
import ssl
import signal
import asyncio
import json
import logging
from typing import Dict, List, Set
from fastapi import HTTPException

from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

from backend.robot_controller import RobotController
from backend.config import ASSETS_DIR, UPLOADS_DIR, ASSETS_URL_PATH, UPLOADS_URL_PATH

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup (replaces the @app.on_event("startup") handler)
    robot_controller.start()
    asyncio.create_task(publish_joint_states())
    
    yield
    
    robot_controller.stop()

app = FastAPI(
    title="Robot Visualization Server",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static file directories
app.mount(ASSETS_URL_PATH, StaticFiles(directory=ASSETS_DIR), name="assets")
app.mount(UPLOADS_URL_PATH, StaticFiles(directory=UPLOADS_DIR), name="uploads")

robot_controller = RobotController()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.active_connections.add(websocket)
            logger.info(f"Client connected. Active connections: {len(self.active_connections)}")
    
    async def disconnect(self, websocket: WebSocket):
        async with self.lock:
            self.active_connections.discard(websocket)
            logger.info(f"Client disconnected. Active connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: Dict):
        disconnected_clients = set()
        
        async with self.lock:
            connections_copy = set(self.active_connections)
        
        for websocket in connections_copy:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to client: {e}")
                disconnected_clients.add(websocket)
        
        if disconnected_clients:
            async with self.lock:
                for websocket in disconnected_clients:
                    if websocket in self.active_connections:
                        self.active_connections.remove(websocket)

manager = ConnectionManager()

# @app.on_event("startup")
# async def startup_event():
#     robot_controller.start()
    
#     asyncio.create_task(publish_joint_states())

# @app.on_event("shutdown")
# async def shutdown_event():
#     robot_controller.stop()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                logger.debug(f"Received message: {message}")
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received: {data}")
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await manager.disconnect(websocket)

async def publish_joint_states():
    while True:
        try:
            joint_positions = robot_controller.get_joint_positions()
            
            message = {
                "type": "joint_states",
                "joint_positions": joint_positions,
                "timestamp": robot_controller.get_timestamp()
            }
            
            await manager.broadcast(message)
            
            await asyncio.sleep(0.05)
        except Exception as e:
            logger.error(f"Error in joint state publisher: {e}")
            await asyncio.sleep(1)

def generate_ssl_context():
    ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    
    cert_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "certs", "cert.pem")
    key_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "certs", "key.pem")
    
    if os.path.exists(cert_path) and os.path.exists(key_path):
        ssl_context.load_cert_chain(cert_path, key_path)
        return ssl_context
    else:
        logger.warning("SSL certificates not found. Server will run without HTTPS/WSS.")
        return None

if __name__ == "__main__":
    ssl_context = generate_ssl_context()
    
    if ssl_context:
        uvicorn.run(
            "backend.main:app",
            host="0.0.0.0",
            port=8000,
            ssl_keyfile=os.path.join(os.path.dirname(os.path.dirname(__file__)), "certs", "key.pem"),
            ssl_certfile=os.path.join(os.path.dirname(os.path.dirname(__file__)), "certs", "cert.pem"),
            reload=True
        )
    else:
        uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

import os
import uuid
import time
import math
import threading
import logging
from typing import Dict

import numpy as np
from yourdfpy import URDF
from backend.config import ASSETS_DIR, UPLOADS_DIR, DEFAULT_URDF, get_upload_dir, get_upload_url

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("robot_controller")

class RobotController:
    
    def __init__(self):
        self.running = False
        self.thread = None
        self.lock = threading.Lock()
        self.joint_positions = {}
        self.timestamp = 0.0
        
        self.init_load_robot_model()
        
        self.initialize_joint_positions()
    
    def init_load_robot_model(self):
        try:
            urdf_path = str(ASSETS_DIR / DEFAULT_URDF)
            logger.info(f"Loading robot model from: {urdf_path}")
            
            self.robot = URDF.load(urdf_path)
            self.joint_names = [joint for joint in self.robot.joint_names]
            
            logger.info(f"Robot model loaded successfully with joints: {self.joint_names}")
        except Exception as e:
            logger.error(f"Error loading robot model: {e}")
            raise
    
    async def update_robot_model(self, urdf_file, mesh_files=None):
        try:
            with self.lock:
                model_id = str(uuid.uuid4())
                model_dir = get_upload_dir(model_id)
                model_dir.mkdir(exist_ok=True)
                
                urdf_filename = urdf_file.filename
                urdf_content = await urdf_file.read()  
                urdf_path = str(model_dir / urdf_filename)
                with open(urdf_path, 'wb') as f:
                    f.write(urdf_content)
                
                if mesh_files:
                    for mesh_file in mesh_files:
                        relative_path = "meshes/" + "/".join(mesh_file.filename.split('/')[:-1])
                        absolute_path = os.path.join(model_dir, relative_path)
                        parent_dir = os.path.dirname(absolute_path)
                        os.makedirs(parent_dir, exist_ok=True)
                        mesh_content = await mesh_file.read()
                        with open(absolute_path, "wb") as f:
                            f.write(mesh_content)
                            f.flush()
                            os.fsync(f.fileno())
                
                self.robot = URDF.load(urdf_path)
                self.joint_names = [joint for joint in self.robot.joint_names]
                self.initialize_joint_positions()
                
                logger.info(f"Robot model updated successfully with joints: {self.joint_names}")
                return get_upload_url(model_id, urdf_filename), True
        except Exception as e:
            logger.error(f"Error updating robot model: {e}")
            return None, False
    
    def initialize_joint_positions(self):
        # with self.lock:
        for joint_name in self.joint_names:
            self.joint_positions[joint_name] = 0.0
    
    def update_joint_positions(self):
        with self.lock:
            current_time = time.time()
            self.timestamp = current_time
            
            for i, joint_name in enumerate(self.joint_names):
                frequency = 0.2 + (i * 0.05)
                amplitude = 0.5
                
                position = amplitude * math.sin(frequency * current_time)
                
                self.joint_positions[joint_name] = position
    
    def get_joint_positions(self) -> Dict[str, float]:
        with self.lock:
            return self.joint_positions.copy()
    
    def get_timestamp(self) -> float:
        with self.lock:
            return self.timestamp
    
    def joint_updater(self):
        while self.running:
            try:
                self.update_joint_positions()
                time.sleep(0.01)
            except Exception as e:
                logger.error(f"Error in joint updater: {e}")
                time.sleep(1)
    
    def start(self):
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self.joint_updater)
            self.thread.daemon = True
            self.thread.start()
            logger.info("Robot controller started")
    
    def stop(self):
        """Stop the robot controller thread gracefully."""
        logger.info("Stopping robot controller...")
        self.running = False
        
        if self.thread:
            self.thread.join(timeout=2.0)
            self.thread = None
        logger.info("Robot controller stopped")

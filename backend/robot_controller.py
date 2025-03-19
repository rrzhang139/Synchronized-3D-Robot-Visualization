import os
import time
import math
import threading
import logging
from typing import Dict

import numpy as np
from urdfpy import URDF

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
        
        self.load_robot_model()
        
        self.initialize_joint_positions()
    
    def load_robot_model(self):
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(current_dir)
            urdf_path = os.path.join(project_root, "backend", "assets", "iiwa14_glb.urdf")
            
            if not os.path.exists(urdf_path):
                logger.error(f"URDF file not found at path: {urdf_path}")
                raise FileNotFoundError(f"URDF file not found at path: {urdf_path}")
            
            logger.info(f"Loading robot model from: {urdf_path}")
            
            self.robot = URDF.load(urdf_path)
            
            self.joint_names = [joint.name for joint in self.robot.joints if joint.joint_type != "fixed"]
            
            logger.info(f"Robot model loaded successfully with joints: {self.joint_names}")
        except Exception as e:
            logger.error(f"Error loading robot model: {e}")
            raise
    
    def initialize_joint_positions(self):
        with self.lock:
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
        self.running = False
        if self.thread:
            self.thread.join(timeout=2.0)
            self.thread = None
        logger.info("Robot controller stopped")

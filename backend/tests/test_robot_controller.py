import time
import unittest
import threading

from backend.robot_controller import RobotController

class TestRobotController(unittest.TestCase):
    def setUp(self):
        self.robot_controller = RobotController()
    
    def tearDown(self):
        if self.robot_controller.running:
            self.robot_controller.stop()
    
    def test_initialization(self):
        """Test that the robot controller initializes correctly"""
        # Check that joint names were loaded
        self.assertTrue(len(self.robot_controller.joint_names) > 0)
        
        # Check that joint positions were initialized
        joint_positions = self.robot_controller.get_joint_positions()
        self.assertEqual(len(joint_positions), len(self.robot_controller.joint_names))
        
        # Check that all joint positions are initialized to 0.0
        for position in joint_positions.values():
            self.assertEqual(position, 0.0)
    
    def test_update_joint_positions(self):
        """Test that joint positions are updated correctly"""
        # Get initial joint positions
        initial_positions = self.robot_controller.get_joint_positions()
        
        # Update joint positions
        self.robot_controller.update_joint_positions()
        
        # Get updated joint positions
        updated_positions = self.robot_controller.get_joint_positions()
        
        # Check that joint positions were updated
        for joint_name in self.robot_controller.joint_names:
            self.assertNotEqual(initial_positions[joint_name], updated_positions[joint_name])
    
    def test_start_stop(self):
        """Test starting and stopping the robot controller"""
        # Start the robot controller
        self.robot_controller.start()
        
        # Check that the controller is running
        self.assertTrue(self.robot_controller.running)
        self.assertIsNotNone(self.robot_controller.thread)
        self.assertTrue(self.robot_controller.thread.is_alive())
        
        # Wait a bit for joint positions to update
        time.sleep(0.1)
        
        # Get joint positions
        joint_positions = self.robot_controller.get_joint_positions()
        
        # Check that joint positions are non-zero
        for position in joint_positions.values():
            self.assertNotEqual(position, 0.0)
        
        # Stop the robot controller
        self.robot_controller.stop()
        
        # Check that the controller is stopped
        self.assertFalse(self.robot_controller.running)
        
        # Wait for thread to terminate
        time.sleep(0.1)
        
        # Check that thread is terminated
        self.assertIsNone(self.robot_controller.thread)

if __name__ == "__main__":
    unittest.main()
import os
from pathlib import Path

# Project structure configuration
BASE_DIR = Path(__file__).parent.parent  # Project root
BACKEND_DIR = BASE_DIR / "backend"

# Static file directories
ASSETS_DIR = BACKEND_DIR / "assets"
UPLOADS_DIR = BACKEND_DIR / "uploads"

# Create directories if they don't exist
UPLOADS_DIR.mkdir(exist_ok=True)

# Default URDF configuration
DEFAULT_URDF = "iiwa14_glb.urdf"

# URLs for static file serving
ASSETS_URL_PATH = "/assets"
UPLOADS_URL_PATH = "/uploads"

# Helper functions
def get_upload_dir(model_id):
    """Get the filesystem path for a specific model upload"""
    return UPLOADS_DIR / model_id

def get_upload_url(model_id, filename=None):
    """Get the URL for accessing an uploaded model"""
    if filename:
        return f"{UPLOADS_URL_PATH}/{model_id}/{filename}"
    return f"{UPLOADS_URL_PATH}/{model_id}"

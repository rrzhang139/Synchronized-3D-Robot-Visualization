# Synchronized 3D Robot Visualization Project

A web application that demonstrates synchronized robot visualization between a Python backend and Three.js frontend using WebSocket communication.

## Features

- Real-time 3D robot visualization using Three.js
- URDF model loading and rendering
- Python ASGI backend for robot state management
- Secure WebSocket communication over HTTPS/TLS
- Continuous robot joint movement simulation

## Installation

### Frontend

```bash
cd frontend
npm install
```

### Backend

```bash
# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Setup

### HTTPS/TLS Configuration

1. Generate self-signed certificates for development:

```bash
mkdir -p certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem
```

2. Trust the certificate in your browser (development only).

## Running the Application

### Start the Backend

```bash
python -m backend.main
```

### Start the Frontend

```bash
cd frontend
npm run dev
```

Open your browser and navigate to `https://localhost:3000`

## Dependencies

### Frontend
- Three.js - 3D graphics library
- urdf-loader - For loading and rendering URDF models
- TypeScript - For type safety
- Vite - For fast development and building

### Backend
- FastAPI - ASGI web framework
- Uvicorn - ASGI server
- yourdfpy/urdfpy - For URDF parsing and manipulation
- websockets - For WebSocket communication

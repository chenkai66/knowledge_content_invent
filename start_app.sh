#!/bin/bash

# Startup script for the knowledge content generation application
echo "Starting Knowledge Content Generation Application..."

# Start the backend server in the background
echo "Starting backend server on port 4000..."
cd /Users/kchen/Desktop/Project/knowledge_content_invent/backend
node minimal_server.js > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend server started with PID: $BACKEND_PID"

# Wait a moment for the backend to start
sleep 3

# Verify the backend is running
if lsof -i :4000 >/dev/null; then
    echo "✓ Backend server is running on port 4000"
else
    echo "✗ Backend server failed to start on port 4000"
    echo "Check backend.log for details"
    exit 1
fi

# Start the frontend development server in the background
echo "Starting frontend development server on port 3000..."
cd /Users/kchen/Desktop/Project/knowledge_content_invent
npx vite > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend server started with PID: $FRONTEND_PID"

# Wait a moment for the frontend to start
sleep 5

# Verify the frontend is running
if lsof -i :3000 >/dev/null; then
    echo "✓ Frontend server is running on port 3000"
    echo "Application is now running!"
    echo "Frontend: http://localhost:3000"
    echo "Backend health check: http://localhost:4000/health"
    echo ""
    echo "The application will store generated content in:"
    echo "/Users/kchen/Desktop/Project/knowledge_content_invent/backend/history/"
else
    echo "✗ Frontend server failed to start on port 3000"
    echo "Check frontend.log for details"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi
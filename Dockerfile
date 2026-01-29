# Build Stage for Frontend
FROM node:20-alpine as build

WORKDIR /app

# Copy frontend files
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./

# Build the application
RUN npm run build

# Runtime Stage for Backend
FROM python:3.11-slim

WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Install backend dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/main.py .

# Copy built frontend from build stage
COPY --from=build /app/dist ./static

# Cloud Run expects the container to listen on $PORT (default 8080)
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"

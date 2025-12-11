# Build Stage for Frontend
FROM node:20-alpine as build

WORKDIR /app

# Copy package files (Enable caching for npm install)
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY types.ts ./

# Install dependencies
RUN npm install

# Copy source code (files that change more often)
COPY index.html ./
COPY App.tsx ./
COPY index.tsx ./
COPY components ./components
COPY utils ./utils

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
# We use shell form to allow variable expansion
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"

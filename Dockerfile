# Build Stage for Frontend
FROM node:20-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY types.ts ./

# Install dependencies
RUN npm install

# Copy source code
COPY App.tsx ./
COPY index.tsx ./
COPY components ./components

# Build the application
RUN npm run build

# Runtime Stage for Backend
FROM python:3.11-slim

WORKDIR /app

# Install backend dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/main.py .

# Copy built frontend from build stage
COPY --from=build /app/dist ./static

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

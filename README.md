# 🎮 Tic-Tac-Toe Multiplayer

A high-performance, real-time Tic-Tac-Toe game featuring a modern tech stack and seamless multiplayer experience.

<p align="center">
  <img width="800" src="https://github.com/user-attachments/assets/aa8faed4-5bd7-4001-ae2d-2fdf511cb020" alt="Tic-Tac-Toe Banner" />
</p>

## ✨ Features

- **Real-time Gameplay**: Powered by WebSockets for zero-latency moves.
- **Modern Tech Stack**: React (Frontend) meets FastAPI (Backend).
- **Interactive UI**: Sleek design with responsive layouts.
- **Easy Deployment**: Fully containerized with Docker.

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | [React](https://reactjs.org/), [Vite](https://vitejs.dev/), TypeScript |
| **Backend** | [FastAPI](https://fastapi.tiangolo.com/), Python, WebSockets |
| **Infrastructure** | [Docker](https://www.docker.com/) |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [Python](https://www.python.org/) (v3.9+)
- [Docker](https://www.docker.com/) (Optional)

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/radekkubryn/Tic-Tac-Toe-Multiplayer.git
   cd Tic-Tac-Toe-Multiplayer
   ```

2. **Start Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

3. **Start Frontend**:
   ```bash
   # Open a new terminal session
   cd Tic-Tac-Toe-Multiplayer
   npm install
   npm run dev
   ```

### 🐳 Running with Docker

Build and run the entire application using the provided Dockerfile:

```bash
docker build -t tic-tac-toe-multiplayer .
docker run -p 8000:8000 tic-tac-toe-multiplayer
```

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

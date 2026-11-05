#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🛑 Đang dừng Freelancer AI Platform..."

if [ -f "$DIR/.backend.pid" ]; then
    BACKEND_PID=$(cat "$DIR/.backend.pid")
    kill $BACKEND_PID 2>/dev/null && echo "✅ Đã dừng Backend (PID: $BACKEND_PID)"
    rm "$DIR/.backend.pid"
fi

if [ -f "$DIR/.frontend.pid" ]; then
    FRONTEND_PID=$(cat "$DIR/.frontend.pid")
    kill $FRONTEND_PID 2>/dev/null && echo "✅ Đã dừng Frontend (PID: $FRONTEND_PID)"
    rm "$DIR/.frontend.pid"
fi

# Quét sạch tiến trình nếu còn chạy trên port
pkill -f "runserver 127.0.0.1:8000" 2>/dev/null || true
pkill -f "vite --host 127.0.0.1 --port 5173" 2>/dev/null || true

echo "✅ Toàn bộ dịch vụ đã được dừng thành công."

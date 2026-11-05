#!/bin/bash

# Freelancer AI Platform - Script khởi động toàn diện
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================="
echo "🚀 ĐANG KHỞI ĐỘNG FREELANCER AI PLATFORM"
echo "=========================================="

# 1. Kiểm tra kết nối PostgreSQL Database
echo "📦 [1/4] Kiểm tra PostgreSQL Database..."
if /Library/PostgreSQL/18/bin/pg_isready -h localhost -p 5432 -q; then
    echo "✅ Database PostgreSQL đang hoạt động sẵn sàng."
else
    echo "⚠️ Dịch vụ PostgreSQL chưa chạy! Đang kiểm tra cấu hình..."
    echo "💡 Mẹo: PostgreSQL 18 trên Mac tự chạy cùng máy tính qua dịch vụ hệ thống."
fi

# 2. Khởi động Backend (Django)
echo "🐍 [2/4] Khởi động Backend & kết nối Database..."
cd "$DIR/backend"
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "❌ Không tìm thấy thư mục venv trong backend!"
    exit 1
fi

# Chạy migrate để đảm bảo DB luôn đồng bộ
python manage.py migrate --noinput

# Dừng server cũ nếu còn chạy
pkill -f "runserver 127.0.0.1:8000" 2>/dev/null || true

# Khởi động Backend server
nohup python manage.py runserver 127.0.0.1:8000 > "$DIR/backend.log" 2>&1 &
BACKEND_PID=$!
disown $BACKEND_PID 2>/dev/null || true
echo "$BACKEND_PID" > "$DIR/.backend.pid"
echo "✅ Backend đã khởi động (PID: $BACKEND_PID) -> http://127.0.0.1:8000"

# 3. Khởi động Frontend (Vite React)
echo "💻 [3/4] Khởi động Frontend..."
cd "$DIR/frontend"

# Dừng frontend cũ nếu còn chạy
pkill -f "vite --host 127.0.0.1 --port 5173" 2>/dev/null || true

nohup npm run dev -- --host 127.0.0.1 --port 5173 > "$DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
disown $FRONTEND_PID 2>/dev/null || true
echo "$FRONTEND_PID" > "$DIR/.frontend.pid"
echo "✅ Frontend đã khởi động (PID: $FRONTEND_PID) -> http://127.0.0.1:5173"

# 4. Mở trình duyệt web
echo "🌐 [4/4] Mở giao diện website..."
sleep 2
open "http://127.0.0.1:5173"

echo "=========================================="
echo "🎉 TẤT CẢ DỊCH VỤ ĐÃ SẴN SÀNG!"
echo "🌐 Frontend : http://127.0.0.1:5173"
echo "🌐 Backend  : http://127.0.0.1:8000/api/"
echo "🛑 Để dừng : ./stop.sh"
echo "=========================================="

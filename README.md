# CaNhan-28211101030
Xây dựng nền tảng kết nối công việc Freelance tích hợp AI đánh giá năng lực - GVHD: ThS. Lương Thị Thu Phương

---

## 📌 THÔNG TIN ĐỀ TÀI & SINH VIÊN
- **Tên đề tài:** Xây dựng nền tảng kết nối công việc Freelance tích hợp AI đánh giá năng lực
- **Sinh viên thực hiện:** Nguyễn Phi
- **Mã số sinh viên (MSSV):** 28211101030
- **Giảng viên hướng dẫn (GVHD):** ThS. Lương Thị Thu Phương
- **Đơn vị:** Khoa Công nghệ Thông tin - Trường Đại học Duy Tân (DTU)
- **Năm học:** 2025 - 2026

---

## 📖 GIỚI THIỆU TỔNG QUAN
Hệ thống là một nền tảng tuyển dụng và kết nối việc làm Freelance hiện đại, tích hợp công nghệ Trí tuệ Nhân tạo (Generative AI) nhằm:
1. **Đánh giá năng lực tự động:** Phân tích CV ứng viên, trích xuất kỹ năng, kinh nghiệm và chấm điểm năng lực (AI Score).
2. **Khớp nối công việc thông minh:** Sử dụng tìm kiếm ngữ nghĩa (Vector Embedding & Semantic Search) để gợi ý công việc phù hợp nhất với hồ sơ Freelancer.
3. **Lộ trình phát triển sự nghiệp:** Đề xuất lộ trình học tập (Roadmap), bài kiểm tra kiến thức (Quiz) và bộ câu hỏi phỏng vấn thử nghiệm được cá nhân hóa bằng AI.
4. **Hệ sinh thái toàn diện:** Hỗ trợ quy trình tuyển dụng khép kín: Đăng tin, Ứng tuyển, Báo giá/Đấu thầu, Nhắn tin trực tiếp (Chat), Đánh giá & Phản hồi, Tích hợp Ví điện tử và Cổng thanh toán MoMo.

---

## 🛠️ CÔNG NGHỆ SỬ DỤNG
### 1. Backend
- **Framework:** Python 3 / Django 6.0 & Django REST Framework (DRF)
- **Authentication:** JWT (JSON Web Token - `rest_framework_simplejwt`)
- **Database:** PostgreSQL tích hợp extension `pgvector` phục vụ lưu trữ và truy vấn vector embedding
- **AI Engine:** Google Gemini AI API (`google-genai`)
- **Payment Gateway:** MoMo Sandbox API & Stripe
- **Khác:** Python-Magic, PDFPlumber, CORS Headers, Python-Dotenv

### 2. Frontend
- **Framework:** React 19 + Vite 8
- **Styling:** TailwindCSS v4 + CSS Custom Variables
- **Icons & UI:** Lucide React, Material Symbols, Canvas-Confetti, Recharts
- **State & Data Fetching:** TanStack React Query v5, Axios Interceptors
- **Đa ngôn ngữ & Thông báo:** React-i18next, React-Hot-Toast

---

## 📅 LỘ TRÌNH 10 GIAI ĐOẠN PHÁT TRIỂN (ROADMAP ĐẾN KHI BẢO VỆ)

| Giai đoạn | Tiến độ | Nội dung công việc chính | Trạng thái |
| :--- | :---: | :--- | :---: |
| **Giai đoạn 1** | **10%** | **Khởi tạo kiến trúc dự án:** Thiết lập cấu trúc Backend Django REST Framework, Frontend React Vite, cấu hình môi trường, Custom User model và Landing Page giới thiệu. | **Hoàn thành** |
| **Giai đoạn 2** | 20% | **Hệ thống Xác thực & Phân quyền:** Đăng ký tài khoản, Đăng nhập JWT, xác thực mã OTP qua Email, phân quyền Role (Freelancer / Client). | Sắp tới |
| **Giai đoạn 3** | 30% | **Quản lý Hồ sơ & Kỹ năng:** Xây dựng hồ sơ Freelancer Profile, Company Profile, quản lý kỹ năng, học vấn, kinh nghiệm làm việc và Portfolio. | Sắp tới |
| **Giai đoạn 4** | 40% | **Quản lý Tin tuyển dụng:** Phân hệ Jobs: Đăng tin việc làm, danh sách tuyển dụng, bộ lọc tìm kiếm theo danh mục, mức lương, kỹ năng yêu cầu. | Sắp tới |
| **Giai đoạn 5** | 50% | **Quy trình Ứng tuyển & Báo giá:** Nộp hồ sơ ứng tuyển, cơ chế đấu thầu (Bidding), gửi thư xin việc (Cover Letter), nhà tuyển dụng xét duyệt ứng viên. | Sắp tới |
| **Giai đoạn 6** | 60% | **Hệ thống Giao tiếp & Trò chuyện:** Phân hệ Chat: Nhắn tin trực tiếp giữa Freelancer và Nhà tuyển dụng, quản lý trạng thái tin nhắn. | Sắp tới |
| **Giai đoạn 7** | 70% | **Tích hợp Cổng thanh toán & Ví điện tử:** Module Payments: Nạp tiền vào ví, quản lý giao dịch, tích hợp cổng thanh toán trực tuyến MoMo Sandbox. | Sắp tới |
| **Giai đoạn 8** | 80% | **Hệ thống Đánh giá & Tương tác:** Chấm điểm sao & nhận xét sau khi hoàn thành công việc, lưu việc làm yêu thích (Saved Jobs), hệ thống thông báo. | Sắp tới |
| **Giai đoạn 9** | 90% | **Tích hợp AI Engine thông minh:** Phân tích CV bằng Gemini AI, tự động trích xuất thông tin, chấm điểm năng lực ứng viên và gợi ý việc làm. | Sắp tới |
| **Giai đoạn 10** | 100% | **Hoàn thiện UI/UX & Báo cáo:** Tinh chỉnh toàn bộ giao diện, kiểm thử bảo mật, nạp dữ liệu mẫu (Seed Data) và hoàn thiện báo cáo đồ án tốt nghiệp. | Sắp tới |

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN

### 1. Khởi động Cơ sở dữ liệu (PostgreSQL + pgvector)
```bash
docker-compose up -d
```

### 2. Cài đặt & Chạy Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Trên macOS/Linux (venv\Scripts\activate trên Windows)
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```
Backend API sẽ chạy tại: `http://127.0.0.1:8000/`

### 3. Cài đặt & Chạy Frontend
```bash
cd frontend
npm install
npm run dev
```
Giao diện người dùng sẽ chạy tại: `http://localhost:5173/`

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import './App.css';

// Placeholder cho các trang chức năng sẽ triển khai trong các Sprint tiếp theo
const ComingSoon = ({ title }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6">
    <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
      <h2 className="text-2xl font-bold mb-2 text-primary">{title}</h2>
      <p className="text-slate-600 mb-6">Chức năng đang được phát triển trong giai đoạn tiếp theo của đồ án tốt nghiệp.</p>
      <a href="/" className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition">
        Quay lại Trang chủ
      </a>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Sprint 1: Khởi tạo Landing Page & Cấu trúc định tuyến nền tảng */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Các Route cho các Sprint tiếp theo (Đăng nhập, Đăng ký, Dashboard, AI Chat...) */}
        <Route path="/login" element={<ComingSoon title="Đăng nhập (Sprint 2)" />} />
        <Route path="/register" element={<ComingSoon title="Đăng ký tài khoản (Sprint 2)" />} />
        <Route path="/find-jobs" element={<ComingSoon title="Tìm việc làm (Sprint 4)" />} />
        
        {/* Điều hướng mặc định */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

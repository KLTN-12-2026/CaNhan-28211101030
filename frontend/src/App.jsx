import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import FreelancerDashboard from './pages/FreelancerDashboard';
import ClientDashboard from './pages/ClientDashboard';
import Profile from './pages/Profile';
import CompanyProfile from './pages/CompanyProfile';
import PublicCompanyProfile from './pages/PublicCompanyProfile';
import PostJob from './pages/PostJob';
import MyJobs from './pages/MyJobs';
import Notifications from './pages/Notifications';
import AIChat from './pages/AIChat';
import FindJobs from './pages/FindJobs';
import JobDetail from './pages/JobDetail';
import JobApplicants from './pages/JobApplicants';
import PublicFreelancerProfile from './pages/PublicFreelancerProfile';
import Chat from './pages/Chat';
import WalletPage from './pages/WalletPage';
import './App.css';
import MyAISkills from './pages/MyAISkills';
import Settings from './pages/Settings';
import Applications from './pages/Applications';
import Learning from './pages/Learning';
import TalentPool from './pages/TalentPool';
import StaticInfoPage from './pages/StaticInfoPage';

// 🛡️ BẢO VỆ ROUTE (Đã được vá lỗi chống lặp vô hạn)
const ProtectedRoute = ({ children, allowedRole }) => {
  const token = sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
  const role = sessionStorage.getItem('user_role') || localStorage.getItem('user_role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Nếu truy cập sai trang so với Role của mình
  if (allowedRole && role !== allowedRole) {
    if (role === 'freelancer') return <Navigate to="/freelancer" replace />;
    if (role === 'client') return <Navigate to="/client" replace />;

    // Nếu role bị lỗi/rỗng -> xoá bộ nhớ và bắt đăng nhập lại
    sessionStorage.clear();
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTE: Ai cũng vào được */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/about" element={<StaticInfoPage />} />
        <Route path="/terms" element={<StaticInfoPage />} />
        <Route path="/privacy" element={<StaticInfoPage />} />
        <Route path="/careers" element={<StaticInfoPage />} />
        <Route path="/press" element={<StaticInfoPage />} />
        <Route path="/cookies" element={<StaticInfoPage />} />

        {/* PROTECTED ROUTES: Dành riêng cho FREELANCER */}
        <Route path="/freelancer" element={
          <ProtectedRoute allowedRole="freelancer">
            <FreelancerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute allowedRole="freelancer">
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/find-jobs" element={
          <ProtectedRoute allowedRole="freelancer">
            <FindJobs />
          </ProtectedRoute>
        } />
        <Route path="/applications" element={
          <ProtectedRoute allowedRole="freelancer">
            <Applications />
          </ProtectedRoute>
        } />
        <Route path="/jobs/:id" element={
          <ProtectedRoute allowedRole="freelancer">
            <JobDetail />
          </ProtectedRoute>
        } />

        <Route path="/my-ai-skills" element={
          <ProtectedRoute allowedRole="freelancer">
            <MyAISkills />
          </ProtectedRoute>
        } />

        {/* PROTECTED ROUTES: Dành riêng cho CLIENT */}
        <Route path="/client" element={
          <ProtectedRoute allowedRole="client">
            <ClientDashboard />
          </ProtectedRoute>
        } />
        <Route path="/company" element={
          <ProtectedRoute allowedRole="client">
            <CompanyProfile />
          </ProtectedRoute>
        } />
        <Route path="/client-profile" element={<Navigate to="/company" replace />} />
        <Route path="/post-job" element={
          <ProtectedRoute allowedRole="client">
            <PostJob />
          </ProtectedRoute>
        } />
        <Route path="/my-jobs" element={
          <ProtectedRoute allowedRole="client">
            <MyJobs />
          </ProtectedRoute>
        } />
        <Route path="/job-applicants/:id" element={
          <ProtectedRoute allowedRole="client">
            <JobApplicants />
          </ProtectedRoute>
        } />
        <Route path="/talent-pool" element={
          <ProtectedRoute allowedRole="client">
            <TalentPool />
          </ProtectedRoute>
        } />
        <Route path="/freelancer-profile/:id" element={<PublicFreelancerProfile />} />

        <Route path="/notifications" element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        } />
        <Route path="/ai-chat" element={
          <ProtectedRoute>
            <AIChat />
          </ProtectedRoute>
        } />

        <Route path="/chat" element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        } />
        <Route path="/wallet" element={
          <ProtectedRoute>
            <WalletPage />
          </ProtectedRoute>
        } />
        <Route path="/learning" element={
          <ProtectedRoute allowedRole="freelancer">
            <Learning />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/public-profile/:id" element={<PublicCompanyProfile />} />

        {/* Đường dẫn linh tinh (404) đẩy về trang chủ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
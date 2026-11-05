import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../api';
import toast from 'react-hot-toast';
import MockGoogleModal from '../components/MockGoogleModal';

function Login() {
    const [role, _setRole] = useState('freelancer');
    const roleRef = useRef('freelancer');

    const setRole = (newRole) => {
        roleRef.current = newRole;
        _setRole(newRole);
    };
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [showMockGoogleModal, setShowMockGoogleModal] = useState(false);

    // States for Forgot Password Modal
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotStep, setForgotStep] = useState(1);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotOtp, setForgotOtp] = useState('');
    const [forgotNewPassword, setForgotNewPassword] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError] = useState('');

    const navigate = useNavigate();

    const handleSendResetOTP = async (e) => {
        if (e) e.preventDefault();
        if (!forgotEmail.trim()) {
            setForgotError("Vui lòng nhập địa chỉ email.");
            return;
        }
        setForgotLoading(true);
        setForgotError('');
        try {
            const res = await api.post('auth/send-reset-password-otp/', { email: forgotEmail.trim() });
            toast.success(res.data?.message || "Mã xác thực đã được gửi về email!");
            if (res.data?.dev_otp) {
                setForgotOtp(res.data.dev_otp);
            }
            setForgotStep(2);
        } catch (err) {
            setForgotError(err.response?.data?.error || "Không thể gửi mã xác thực. Vui lòng kiểm tra lại email.");
        } finally {
            setForgotLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        if (e) e.preventDefault();
        if (!forgotOtp.trim() || !forgotNewPassword) {
            setForgotError("Vui lòng nhập đầy đủ mã OTP và mật khẩu mới.");
            return;
        }
        setForgotLoading(true);
        setForgotError('');
        try {
            const res = await api.post('auth/reset-password/', {
                email: forgotEmail.trim(),
                otp: forgotOtp.trim(),
                new_password: forgotNewPassword
            });
            toast.success(res.data?.message || "Đặt lại mật khẩu thành công! Vui lòng đăng nhập.");
            setShowForgotModal(false);
            setForgotStep(1);
            setForgotOtp('');
            setForgotNewPassword('');
        } catch (err) {
            setForgotError(err.response?.data?.error || "Đặt lại mật khẩu thất bại.");
        } finally {
            setForgotLoading(false);
        }
    };

    const handleGoogleAuthSuccess = async ({ token, email: customEmail, name: customName, is_mock }) => {
        setLoading(true);
        setErrorMsg('');
        try {
            const res = await api.post('auth/google/', {
                token,
                email: customEmail,
                name: customName,
                is_mock: Boolean(is_mock),
                role: roleRef.current.toUpperCase(),
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                action: 'login'
            });

            const { access, role: userRole, username: responseUsername, user_id } = res.data.user ? {
                access: res.data.access,
                role: res.data.user.role,
                username: res.data.user.username,
                user_id: res.data.user.id
            } : res.data;

            const safeRole = userRole ? String(userRole).toLowerCase() : '';

            if (safeRole && safeRole !== roleRef.current.toLowerCase()) {
                setErrorMsg(`Tài khoản này là ${safeRole === 'freelancer' ? 'Freelancer' : 'Client'}. Vui lòng chọn đúng vai trò để đăng nhập!`);
                setLoading(false);
                return;
            }

            sessionStorage.setItem('access_token', access);
            sessionStorage.setItem('user_role', safeRole || roleRef.current.toLowerCase());
            sessionStorage.setItem('username', responseUsername || '');
            if (user_id) sessionStorage.setItem('user_id', user_id);

            toast.success('Đăng nhập thành công với Google!');
            if (safeRole === 'freelancer' || (!safeRole && roleRef.current.toLowerCase() === 'freelancer')) {
                navigate('/freelancer', { replace: true });
            } else {
                navigate('/client', { replace: true });
            }
        } catch (error) {
            console.error("Google Login Error:", error);
            const errorMessage = error.response?.data?.error || error.response?.data?.detail || "Có lỗi xảy ra khi xác thực với Google.";
            setErrorMsg(typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const googleLogin = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            handleGoogleAuthSuccess({ token: tokenResponse.access_token });
        },
        onError: () => {
            setErrorMsg('Xác thực Google thất bại.');
        }
    });

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            const response = await api.post('auth/login/', {
                username: username,
                password: password
            });

            const { access, role: userRole, username: responseUsername, user_id } = response.data;
            const safeRole = userRole ? String(userRole).toLowerCase() : '';

            if (safeRole !== role) {
                setErrorMsg(`Tài khoản này không phải là ${role === 'freelancer' ? 'Freelancer' : 'Client'}. Vui lòng chọn đúng vai trò!`);
                setLoading(false);
                return;
            }

            sessionStorage.setItem('access_token', access);
            sessionStorage.setItem('user_role', safeRole);
            sessionStorage.setItem('username', responseUsername);
            sessionStorage.setItem('user_id', user_id);

            if (safeRole === 'freelancer') {
                navigate('/freelancer', { replace: true });
            } else {
                navigate('/client', { replace: true });
            }

        } catch (error) {
            console.error("Lỗi đăng nhập:", error);
            setErrorMsg("Sai tên đăng nhập hoặc mật khẩu!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 antialiased text-on-surface relative overflow-hidden bg-slate-950">
            {/* Animated Mesh Gradient Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Floating Shapes */}
            <div className="absolute top-20 left-20 w-32 h-32 border border-emerald-500/10 rounded-3xl rotate-12 animate-bounce opacity-20 hidden md:block"></div>
            <div className="absolute bottom-20 right-20 w-40 h-40 border border-blue-500/10 rounded-full animate-bounce opacity-20 hidden md:block" style={{ animationDelay: '1s' }}></div>

            <main className="w-full max-w-115 flex flex-col items-center relative z-10">
                <div className="mb-10 text-center animate-fade-in-down">
                    <h1 className="text-5xl font-black tracking-tighter text-white mb-4 drop-shadow-xl">
                        Freelance<span className="text-emerald-400">AI</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-85 mx-auto leading-relaxed font-medium">
                        Elevate your career with <span className="text-emerald-400 font-bold">AI-driven</span> matching
                    </p>
                </div>

                <div className="w-full bg-white/5 backdrop-blur-3xl rounded-[2.5rem] p-10 border border-white/10 shadow-2xl"
                    style={{ boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.5)' }}>

                    {/* Role Selection Tabs */}
                    <div className="flex p-1.5 bg-white/5 rounded-full mb-8 relative border border-white/5">
                        <button
                            onClick={() => setRole('freelancer')}
                            type="button"
                            className={`flex-1 py-3 text-sm rounded-full transition-all duration-500 z-10 ${role === 'freelancer'
                                    ? 'font-bold bg-white text-slate-900 shadow-xl'
                                    : 'font-medium text-slate-400 hover:text-white'
                                }`}
                        >
                            Freelancer
                        </button>
                        <button
                            onClick={() => setRole('client')}
                            type="button"
                            className={`flex-1 py-3 text-sm rounded-full transition-all duration-500 z-10 ${role === 'client'
                                    ? 'font-bold bg-white text-slate-900 shadow-xl'
                                    : 'font-medium text-slate-400 hover:text-white'
                                }`}
                        >
                            Client
                        </button>
                    </div>

                    {errorMsg && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl text-center font-bold">
                            {errorMsg}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Tên đăng nhập</label>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors">person</span>
                                <input
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-14 pr-6 py-4 bg-white/5 rounded-2xl border border-white/5 focus:border-emerald-500/50 focus:bg-white/10 outline-none transition-all text-white placeholder:text-slate-600 font-medium"
                                    placeholder="Username" type="text" required
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center px-1">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Mật khẩu</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setForgotError('');
                                        setForgotStep(1);
                                        setShowForgotModal(true);
                                    }}
                                    className="text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                                >
                                    Quên?
                                </button>
                            </div>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors">lock</span>
                                <input
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-14 pr-14 py-4 bg-white/5 rounded-2xl border border-white/5 focus:border-emerald-500/50 focus:bg-white/10 outline-none transition-all text-white placeholder:text-slate-600 font-medium"
                                    placeholder="••••••••" type="password" required
                                />
                            </div>
                        </div>

                        <button disabled={loading} type="submit" className="w-full py-4 rounded-2xl bg-emerald-500 text-slate-950 font-black text-lg shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 hover:-translate-y-1 active:translate-y-0 active:scale-95 transition-all duration-300 disabled:opacity-50">
                            {loading ? 'Processing...' : `Sign In`}
                        </button>
                    </form>

                    <div className="relative my-10">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/5"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-black">
                            <span className="px-4 bg-slate-950 text-slate-600">OR</span>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            const cid = import.meta.env.VITE_GOOGLE_CLIENT_ID;
                            if (!cid || cid.includes('mock-google-client-id')) {
                                setShowMockGoogleModal(true);
                                return;
                            }
                            googleLogin();
                        }}
                        disabled={loading}
                        className="w-full flex items-center justify-center space-x-3 py-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all duration-300 disabled:opacity-50 group cursor-pointer"
                    >
                        <img alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" />
                        <span className="font-bold text-white">Continue with Google</span>
                    </button>

                    <p className="mt-10 text-center text-sm font-medium text-slate-500">
                        Don't have an account? <Link to="/register" className="text-emerald-400 font-black hover:text-emerald-300 transition-colors ml-1">Create Account</Link>
                    </p>
                </div>
            </main>
            <div className="fixed bottom-0 left-0 w-full h-1 bg-linear-to-r from-emerald-500 to-blue-500 opacity-20"></div>

            {/* Modal Giả lập Google OAuth */}
            <MockGoogleModal
                isOpen={showMockGoogleModal}
                onClose={() => setShowMockGoogleModal(false)}
                role={role}
                action="login"
                loading={loading}
                onSelectAccount={(acc) => {
                    setShowMockGoogleModal(false);
                    handleGoogleAuthSuccess({
                        token: acc.token,
                        email: acc.email,
                        name: acc.name,
                        is_mock: true
                    });
                }}
            />

            {/* Modal Quên Mật Khẩu */}
            {showForgotModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
                        <button
                            onClick={() => {
                                setShowForgotModal(false);
                                setForgotStep(1);
                                setForgotError('');
                            }}
                            className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>

                        <div className="flex items-center space-x-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <span className="material-symbols-outlined text-xl">lock_reset</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Khôi phục mật khẩu</h3>
                                <p className="text-xs text-slate-400">
                                    {forgotStep === 1 ? 'Nhập email tài khoản để nhận mã OTP' : 'Xác thực mã OTP và đặt mật khẩu mới'}
                                </p>
                            </div>
                        </div>

                        {forgotError && (
                            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
                                <span className="material-symbols-outlined text-sm">error</span>
                                <span>{forgotError}</span>
                            </div>
                        )}

                        {forgotStep === 1 ? (
                            <form onSubmit={handleSendResetOTP} className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                        Email tài khoản
                                    </label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                                            mail
                                        </span>
                                        <input
                                            type="email"
                                            required
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            placeholder="example@gmail.com"
                                            className="w-full pl-12 pr-4 py-3 bg-white/5 rounded-xl border border-white/10 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-emerald-500/50"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={forgotLoading}
                                    className="w-full py-3.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                                >
                                    {forgotLoading ? (
                                        <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                                    ) : (
                                        <>
                                            <span>Gửi mã xác nhận OTP</span>
                                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                        Mã xác thực OTP (6 chữ số)
                                    </label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                                            key
                                        </span>
                                        <input
                                            type="text"
                                            required
                                            maxLength={6}
                                            value={forgotOtp}
                                            onChange={(e) => setForgotOtp(e.target.value)}
                                            placeholder="Nhập 6 số OTP"
                                            className="w-full pl-12 pr-4 py-3 bg-white/5 rounded-xl border border-white/10 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-emerald-500/50 tracking-widest font-mono font-bold"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                        Mật khẩu mới
                                    </label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                                            lock
                                        </span>
                                        <input
                                            type="password"
                                            required
                                            value={forgotNewPassword}
                                            onChange={(e) => setForgotNewPassword(e.target.value)}
                                            placeholder="Tối thiểu 6 ký tự"
                                            className="w-full pl-12 pr-4 py-3 bg-white/5 rounded-xl border border-white/10 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-emerald-500/50"
                                        />
                                    </div>
                                </div>

                                <div className="flex space-x-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setForgotStep(1);
                                            setForgotError('');
                                        }}
                                        className="w-1/3 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 font-semibold text-xs transition-colors cursor-pointer"
                                    >
                                        Quay lại
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={forgotLoading}
                                        className="w-2/3 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center justify-center space-x-1 cursor-pointer"
                                    >
                                        {forgotLoading ? (
                                            <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                                        ) : (
                                            <span>Đổi mật khẩu</span>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Login;
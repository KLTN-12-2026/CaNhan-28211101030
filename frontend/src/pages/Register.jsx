import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import api from '../api';
import MockGoogleModal from '../components/MockGoogleModal';

function Register() {
    const [role, _setRole] = useState('freelancer');
    const roleRef = useRef('freelancer');

    const setRole = (newRole) => {
        roleRef.current = newRole;
        _setRole(newRole);
    };

    const [fullname, setFullname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Trạng thái cho Modal OTP xác thực Email
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpTimer, setOtpTimer] = useState(60);
    const [isSendingOTP, setIsSendingOTP] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [otpError, setOtpError] = useState('');
    const [devOtp, setDevOtp] = useState(null);
    const [showMockGoogleModal, setShowMockGoogleModal] = useState(false);

    const navigate = useNavigate();

    // Đồng hồ đếm ngược gửi lại OTP
    useEffect(() => {
        let interval = null;
        if (showOTPModal && otpTimer > 0) {
            interval = setInterval(() => {
                setOtpTimer((prev) => prev - 1);
            }, 1000);
        } else if (otpTimer === 0) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [showOTPModal, otpTimer]);

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
                action: 'register'
            });

            const { access, role: userRole, username: responseUsername, user_id } = res.data.user ? {
                access: res.data.access,
                role: res.data.user.role,
                username: res.data.user.username,
                user_id: res.data.user.id
            } : res.data;

            const safeRole = userRole ? String(userRole).toLowerCase() : '';

            if (safeRole && safeRole !== roleRef.current.toLowerCase()) {
                setErrorMsg(`Email này đã được dùng cho tài khoản ${safeRole === 'freelancer' ? 'Freelancer' : 'Client'}. Không thể đăng ký thêm vai trò khác bằng cùng email!`);
                setLoading(false);
                return;
            }

            sessionStorage.setItem('access_token', access || res.data.access);
            sessionStorage.setItem('user_role', safeRole || roleRef.current.toLowerCase());
            sessionStorage.setItem('username', responseUsername || '');
            if (user_id) sessionStorage.setItem('user_id', user_id);

            toast.success('Đăng ký / Đăng nhập thành công với Google!');
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

    // Bước 1: Gửi mã OTP về email trước khi tạo tài khoản
    const handleStartRegistration = async (e) => {
        e.preventDefault();

        if (!fullname.trim()) {
            setErrorMsg('Vui lòng nhập họ và tên của bạn.');
            return;
        }

        if (!email.trim()) {
            setErrorMsg('Vui lòng nhập địa chỉ email.');
            return;
        }

        if (password.length < 6) {
            setErrorMsg('Mật khẩu phải có độ dài từ 6 ký tự trở lên.');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMsg('Mật khẩu xác nhận không khớp!');
            return;
        }

        if (!agreed) {
            setErrorMsg('Bạn phải đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.');
            return;
        }

        setLoading(true);
        setErrorMsg('');

        try {
            const res = await api.post('auth/send-register-otp/', {
                email: email.trim().toLowerCase()
            });

            if (res.data?.dev_otp) {
                setDevOtp(res.data.dev_otp);
            } else {
                setDevOtp(null);
            }

            toast.success(res.data?.message || 'Mã xác thực đã được gửi về Gmail!');
            setShowOTPModal(true);
            setOtp('');
            setOtpError('');
            setOtpTimer(60);
        } catch (error) {
            console.error("Lỗi gửi OTP đăng ký:", error);
            const err = error.response?.data?.error || error.response?.data?.detail || "Không thể gửi mã xác nhận. Vui lòng kiểm tra lại địa chỉ email!";
            setErrorMsg(typeof err === 'object' ? JSON.stringify(err) : err);
        } finally {
            setLoading(false);
        }
    };

    // Gửi lại mã OTP
    const handleResendOTP = async () => {
        if (otpTimer > 0 || isSendingOTP) return;

        setIsSendingOTP(true);
        setOtpError('');

        try {
            const res = await api.post('auth/send-register-otp/', {
                email: email.trim().toLowerCase()
            });

            if (res.data?.dev_otp) {
                setDevOtp(res.data.dev_otp);
            }

            toast.success(res.data?.message || 'Đã gửi lại mã xác thực mới vào Gmail của bạn!');
            setOtpTimer(60);
        } catch (error) {
            const err = error.response?.data?.error || error.response?.data?.detail || "Không thể gửi lại mã OTP. Vui lòng thử lại sau.";
            setOtpError(typeof err === 'object' ? JSON.stringify(err) : err);
        } finally {
            setIsSendingOTP(false);
        }
    };

    // Bước 2: Xác nhận mã OTP và hoàn tất đăng ký tài khoản
    const handleVerifyAndRegister = async (e) => {
        if (e) e.preventDefault();

        const cleanOtp = otp.trim();
        if (!cleanOtp || cleanOtp.length !== 6) {
            setOtpError('Vui lòng nhập đầy đủ 6 chữ số mã OTP.');
            return;
        }

        setIsSubmitting(true);
        setOtpError('');

        try {
            await api.post('auth/register/', {
                username: email.trim().toLowerCase(),
                email: email.trim().toLowerCase(),
                password: password,
                role: roleRef.current.toUpperCase(),
                full_name: fullname.trim(),
                otp: cleanOtp
            });

            toast.success('Đăng ký và xác thực tài khoản thành công! Vui lòng đăng nhập.');
            setShowOTPModal(false);
            navigate('/login');
        } catch (error) {
            console.error("Lỗi xác thực & đăng ký:", error);
            let errMsg = "Mã xác thực không hợp lệ hoặc đã hết hạn.";
            if (error.response?.data) {
                const data = error.response.data;
                if (data.otp) errMsg = Array.isArray(data.otp) ? data.otp[0] : data.otp;
                else if (data.email) errMsg = Array.isArray(data.email) ? data.email[0] : data.email;
                else if (data.username) errMsg = Array.isArray(data.username) ? data.username[0] : data.username;
                else if (data.error) errMsg = data.error;
                else if (data.detail) errMsg = data.detail;
            }
            setOtpError(typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 antialiased text-on-surface relative overflow-hidden bg-slate-950">
            {/* Animated Mesh Gradient Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <main className="w-full max-w-125 flex flex-col items-center relative z-10 py-12">
                <div className="mb-10 text-center animate-fade-in-down">
                    <h1 className="text-4xl font-black tracking-tighter text-white mb-2">
                        Join Freelance<span className="text-emerald-400">AI</span>
                    </h1>
                    <p className="text-slate-400 text-sm font-medium">Tạo tài khoản để bắt đầu hành trình cùng AI</p>
                </div>

                <div className="w-full bg-white/5 backdrop-blur-3xl rounded-[2.5rem] p-10 border border-white/10 shadow-2xl">

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
                            Client (Doanh nghiệp)
                        </button>
                    </div>

                    {errorMsg && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl text-center font-bold">
                            {errorMsg}
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleStartRegistration}>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Họ và tên</label>
                            <input
                                value={fullname}
                                onChange={(e) => setFullname(e.target.value)}
                                className="w-full px-6 py-4 bg-white/5 rounded-2xl border border-white/5 focus:border-emerald-500/50 focus:bg-white/10 outline-none transition-all text-white placeholder:text-slate-600 font-medium"
                                placeholder="Nguyễn Văn A" type="text" required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Địa chỉ Gmail</label>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-6 py-4 bg-white/5 rounded-2xl border border-white/5 focus:border-emerald-500/50 focus:bg-white/10 outline-none transition-all text-white placeholder:text-slate-600 font-medium"
                                placeholder="email@gmail.com" type="email" required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Mật khẩu</label>
                                <input
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-6 py-4 bg-white/5 rounded-2xl border border-white/5 focus:border-emerald-500/50 focus:bg-white/10 outline-none transition-all text-white placeholder:text-slate-600 font-medium"
                                    placeholder="••••••••" type="password" required minLength={6}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Xác nhận mật khẩu</label>
                                <input
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-6 py-4 bg-white/5 rounded-2xl border border-white/5 focus:border-emerald-500/50 focus:bg-white/10 outline-none transition-all text-white placeholder:text-slate-600 font-medium"
                                    placeholder="••••••••" type="password" required minLength={6}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 px-1 py-2">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={e => setAgreed(e.target.checked)}
                                className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer"
                            />
                            <span className="text-xs text-slate-500 font-medium leading-tight">
                                Tôi đồng ý với <a href="#" className="text-emerald-400 hover:underline">Điều khoản dịch vụ</a> và <a href="#" className="text-emerald-400 hover:underline">Chính sách bảo mật</a>
                            </span>
                        </div>

                        <button 
                            disabled={loading} 
                            type="submit" 
                            className="w-full py-4 rounded-2xl bg-emerald-500 text-slate-950 font-black text-lg shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></div>
                                    <span>Đang gửi mã xác thực...</span>
                                </>
                            ) : (
                                <>
                                    <span>Tiếp tục & Nhận mã OTP</span>
                                    <span className="material-symbols-outlined text-xl">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/5"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-black">
                            <span className="px-4 bg-slate-950 text-slate-600">HOẶC</span>
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
                        <span className="font-bold text-white">Đăng ký bằng Google</span>
                    </button>

                    <p className="mt-10 text-center text-sm font-medium text-slate-500">
                        Đã có tài khoản? <Link to="/login" className="text-emerald-400 font-black hover:text-emerald-300 transition-colors ml-1">Đăng nhập</Link>
                    </p>
                </div>
            </main>

            {/* Modal Nhập Mã OTP Xác Thực Gmail */}
            {showOTPModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative text-white animate-scale-up">
                        {/* Nút đóng */}
                        <button 
                            onClick={() => setShowOTPModal(false)}
                            className="absolute top-5 right-5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-2 transition-all cursor-pointer"
                            title="Quay lại"
                        >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10">
                                <span className="material-symbols-outlined text-3xl">mark_email_read</span>
                            </div>
                            <h3 className="text-2xl font-black tracking-tight text-white">Xác thực Gmail</h3>
                            <p className="text-sm text-slate-400 mt-2">
                                Hệ thống vừa gửi mã xác nhận 6 số đến:
                            </p>
                            <div className="mt-2 inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-emerald-400 font-bold text-sm">
                                {email}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                (Vui lòng kiểm tra Hộp thư đến hoặc thư rác/Spam của bạn)
                            </p>
                        </div>

                        {/* Banner gợi ý Dev Mode nếu chưa gắn SMTP Gmail thật */}
                        {devOtp && (
                            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center justify-between">
                                <span>🛠️ Dev Mode OTP: <strong className="font-mono font-bold tracking-widest">{devOtp}</strong></span>
                                <button
                                    type="button"
                                    onClick={() => setOtp(devOtp)}
                                    className="font-bold underline text-amber-400 hover:text-amber-200 cursor-pointer ml-2"
                                >
                                    Điền nhanh
                                </button>
                            </div>
                        )}

                        {otpError && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-bold text-center">
                                {otpError}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 text-center">
                                    Nhập mã 6 chữ số
                                </label>
                                <input
                                    type="text"
                                    maxLength={6}
                                    autoFocus
                                    placeholder="••••••"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full text-center text-3xl tracking-[0.4em] font-mono font-black bg-white/5 border border-white/10 rounded-2xl py-4 text-emerald-400 focus:border-emerald-500/60 focus:bg-white/10 outline-none transition-all placeholder:tracking-normal placeholder:text-slate-600"
                                />
                            </div>

                            <button
                                onClick={handleVerifyAndRegister}
                                disabled={isSubmitting || otp.length !== 6}
                                type="button"
                                className="w-full py-4 rounded-2xl bg-emerald-500 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></div>
                                        <span>Đang xác thực...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[20px]">verified</span>
                                        <span>Xác nhận & Hoàn tất đăng ký</span>
                                    </>
                                )}
                            </button>

                            <div className="text-center pt-2">
                                {otpTimer > 0 ? (
                                    <p className="text-xs text-slate-500 font-medium">
                                        Gửi lại mã xác nhận sau <span className="font-mono font-bold text-emerald-400">{otpTimer}s</span>
                                    </p>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleResendOTP}
                                        disabled={isSendingOTP}
                                        className="text-xs text-emerald-400 hover:text-emerald-300 font-bold underline transition-colors cursor-pointer"
                                    >
                                        {isSendingOTP ? 'Đang gửi...' : 'Chưa nhận được mã? Gửi lại'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal Giả lập Google OAuth */}
            <MockGoogleModal
                isOpen={showMockGoogleModal}
                onClose={() => setShowMockGoogleModal(false)}
                role={role}
                action="register"
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
        </div>
    );
}

export default Register;

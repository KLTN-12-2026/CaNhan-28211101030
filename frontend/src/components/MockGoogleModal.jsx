import React, { useState } from 'react';
import { X, User, Plus, ShieldCheck, ArrowRight } from 'lucide-react';

export default function MockGoogleModal({ isOpen, onClose, onSelectAccount, role = 'freelancer', action = 'login', loading = false }) {
    const [customMode, setCustomMode] = useState(false);
    const [customEmail, setCustomEmail] = useState('');
    const [customName, setCustomName] = useState('');
    const [customError, setCustomError] = useState('');

    if (!isOpen) return null;

    const presetAccounts = [
        {
            name: 'Phin Nguyen',
            email: 'phin09261@gmail.com',
            initial: 'P',
            bg: 'bg-emerald-600',
            badge: 'Tài khoản của bạn'
        },
        {
            name: 'Freelancer Demo',
            email: 'freelancer.demo@gmail.com',
            initial: 'F',
            bg: 'bg-indigo-600',
            badge: 'Tài khoản mẫu'
        },
        {
            name: 'Client Demo',
            email: 'client.demo@gmail.com',
            initial: 'C',
            bg: 'bg-amber-600',
            badge: 'Doanh nghiệp mẫu'
        }
    ];

    const handleSelect = (account) => {
        if (loading) return;
        onSelectAccount({
            email: account.email,
            name: account.name,
            token: `mock-google-token-${Date.now()}`
        });
    };

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        const trimmedEmail = customEmail.trim().toLowerCase();
        if (!trimmedEmail || !trimmedEmail.includes('@')) {
            setCustomError('Vui lòng nhập địa chỉ email hợp lệ.');
            return;
        }
        const name = customName.trim() || trimmedEmail.split('@')[0];
        handleSelect({ email: trimmedEmail, name });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700/60 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-slate-100 animate-scale-up">
                {/* Nút đóng */}
                <button
                    onClick={onClose}
                    disabled={loading}
                    className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Google Logo & Tiêu đề */}
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-white p-2.5 shadow-md mb-3 flex items-center justify-center">
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                            alt="Google Logo"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">
                        Đăng nhập bằng Google
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                        để tiếp tục đến <span className="text-emerald-400 font-semibold">FreelanceAI Platform</span>
                    </p>

                    {/* Huy hiệu Dev Mode */}
                    <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Mô phỏng Google OAuth (KLTN Mode)</span>
                    </div>
                </div>

                {!customMode ? (
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                            Chọn một tài khoản:
                        </p>
                        <div className="space-y-2">
                            {presetAccounts.map((acc, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSelect(acc)}
                                    disabled={loading}
                                    className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800/90 hover:border-emerald-500/40 transition-all duration-200 group text-left cursor-pointer disabled:opacity-50"
                                >
                                    <div className="flex items-center space-x-3 min-w-0">
                                        <div className={`w-10 h-10 rounded-full ${acc.bg} flex items-center justify-center font-bold text-white shadow-sm shrink-0`}>
                                            {acc.initial}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors truncate">
                                                {acc.name}
                                            </div>
                                            <div className="text-xs text-slate-400 truncate">
                                                {acc.email}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/50 shrink-0">
                                        {acc.badge}
                                    </span>
                                </button>
                            ))}

                            {/* Tùy chọn nhập tài khoản khác */}
                            <button
                                onClick={() => setCustomMode(true)}
                                disabled={loading}
                                className="w-full flex items-center space-x-3 p-3.5 rounded-2xl border border-dashed border-slate-700 hover:border-slate-500 hover:bg-slate-800/30 transition-all text-slate-300 text-sm font-medium cursor-pointer"
                            >
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <span>Sử dụng một tài khoản Gmail khác</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleCustomSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">
                                Địa chỉ Email Google
                            </label>
                            <input
                                type="email"
                                value={customEmail}
                                onChange={(e) => {
                                    setCustomEmail(e.target.value);
                                    setCustomError('');
                                }}
                                placeholder="vidu@gmail.com"
                                className="w-full px-4 py-3 bg-slate-800/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">
                                Tên hiển thị (Tùy chọn)
                            </label>
                            <input
                                type="text"
                                value={customName}
                                onChange={(e) => setCustomName(e.target.value)}
                                placeholder="Họ và tên của bạn"
                                className="w-full px-4 py-3 bg-slate-800/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                            />
                        </div>

                        {customError && (
                            <p className="text-xs text-red-400 font-medium">{customError}</p>
                        )}

                        <div className="flex items-center space-x-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setCustomMode(false);
                                    setCustomError('');
                                }}
                                className="flex-1 py-3 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-semibold transition-colors"
                            >
                                Quay lại
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                            >
                                <span>Tiếp tục</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                        Chế độ này tự động mô phỏng quy trình xác thực OAuth2 của Google, tạo hồ sơ vai trò <strong className="text-slate-300">{role === 'freelancer' ? 'Freelancer' : 'Client'}</strong> và đăng nhập ngay mà không cần cấu hình Google Cloud API.
                    </p>
                </div>
            </div>
        </div>
    );
}

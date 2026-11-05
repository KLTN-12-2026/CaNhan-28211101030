import React, { useState, useEffect } from 'react';
import api from '../api';
import FreelancerSidebar from '../components/FreelancerSidebar';
import ClientSidebar from '../components/ClientSidebar';
import FreelancerTopNav from '../components/FreelancerTopNav';
import ClientTopNav from '../components/ClientTopNav';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Settings = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const role = sessionStorage.getItem('user_role');
    const userId = sessionStorage.getItem('user_id');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                if (role === 'freelancer') {
                    const res = await api.get('freelancers/');
                    const allProfiles = res.data.results || res.data;
                    const myProfile = allProfiles.find(p => String(p.user) === String(userId));
                    setProfile(myProfile);
                } else if (role === 'client') {
                    const res = await api.get('companies/');
                    const allCompanies = res.data.results || res.data;
                    const myCompany = allCompanies.find(c => String(c.user) === String(userId));
                    setProfile(myCompany);
                }
            } catch (err) {
                console.error("Error fetching profile for settings:", err);
            }
        };
        if (userId) fetchProfile();
    }, [userId, role]);

    const handleLogout = (e) => {
        if (e) e.preventDefault();
        if (window.confirm(t('common.logoutConfirm') || "Bạn có chắc chắn muốn đăng xuất không?")) {
            sessionStorage.clear();
            localStorage.clear();
            navigate('/');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: t('settings.errorPasswordMismatch') || 'Mật khẩu xác nhận không khớp!' });
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/change-password/', {
                old_password: currentPassword,
                new_password: newPassword
            });
            setMessage({ type: 'success', text: t('settings.successPasswordChange') || 'Mật khẩu đã được thay đổi thành công!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            setMessage({ 
                type: 'error', 
                text: error.response?.data?.error || t('settings.errorGeneral') || 'Có lỗi xảy ra, vui lòng thử lại.' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex font-['Inter'] antialiased">
            {role === 'client' ? (
                <ClientSidebar companyName={profile?.company_name} handleLogout={handleLogout} />
            ) : (
                <FreelancerSidebar profile={profile} username={sessionStorage.getItem('username')} handleLogout={handleLogout} />
            )}
            
            <div className="flex-1 flex flex-col min-h-screen md:pl-64">
                {role === 'client' ? (
                    <ClientTopNav company={profile} username={sessionStorage.getItem('username')} notifications={[]} />
                ) : (
                    <FreelancerTopNav profile={profile} username={sessionStorage.getItem('username')} notifications={[]} />
                )}
                
                <main className="grow flex items-center justify-center p-6 bg-slate-50">
                    <div className="w-full max-w-105">
                        {/* Success/Error Toast */}
                        {message.text && (
                            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-100 w-full max-w-md px-4">
                                <div className={`${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'} px-6 py-4 rounded-2xl flex items-center justify-between shadow-xl border animate-in slide-in-from-top-10 duration-300`}>
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-xl">
                                            {message.type === 'success' ? 'check_circle' : 'error'}
                                        </span>
                                        <span className="text-sm font-bold">{message.text}</span>
                                    </div>
                                    <button onClick={() => setMessage({ type: '', text: '' })} className="hover:bg-black/5 p-1 rounded-full transition-colors">
                                        <span className="material-symbols-outlined text-lg">close</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Logo Section */}
                        <div className="text-center mb-10">
                            <span className="text-2xl font-black tracking-tighter text-teal-700">FreelanceAI</span>
                            <h1 className="text-3xl font-black tracking-tight text-slate-800 mt-6 leading-tight">{t('settings.title') || 'Cài đặt tài khoản'}</h1>
                            <p className="text-slate-500 text-sm mt-3 leading-relaxed px-4 font-medium">
                                {t('settings.subtitle') || 'Quản lý bảo mật và thông tin đăng nhập của bạn'}
                            </p>
                        </div>

                        {/* Form Card */}
                        <div className="bg-white p-10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Current Password */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">{t('settings.oldPassword') || 'Mật khẩu cũ'}</label>
                                    <div className="relative group">
                                        <input 
                                            className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-slate-800 focus:ring-2 focus:ring-teal-500/20 transition-all placeholder:text-slate-300 text-sm font-medium" 
                                            placeholder="••••••••" 
                                            type={showCurrent ? "text" : "password"}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            required
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowCurrent(!showCurrent)}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-xl">{showCurrent ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* New Password */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">{t('settings.newPassword') || 'Mật khẩu mới'}</label>
                                    <div className="relative group">
                                        <input 
                                            className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-slate-800 focus:ring-2 focus:ring-teal-500/20 transition-all placeholder:text-slate-300 text-sm font-medium" 
                                            placeholder="••••••••" 
                                            type={showNew ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowNew(!showNew)}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-xl">{showNew ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">{t('settings.confirmPassword') || 'Xác nhận mật khẩu'}</label>
                                    <div className="relative group">
                                        <input 
                                            className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-slate-800 focus:ring-2 focus:ring-teal-500/20 transition-all placeholder:text-slate-300 text-sm font-medium" 
                                            placeholder="••••••••" 
                                            type={showConfirm ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-xl">{showConfirm ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-14 bg-teal-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-teal-900/10 hover:bg-teal-800 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:translate-y-0"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-xl">lock_reset</span>
                                            {t('settings.saveBtn') || 'Cập nhật mật khẩu'}
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        <div className="mt-12 text-center">
                            <button 
                                onClick={() => navigate(-1)}
                                className="text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-teal-600 transition-colors flex items-center justify-center gap-2 mx-auto"
                            >
                                <span className="material-symbols-outlined text-sm">arrow_back</span>
                                {t('common.back') || 'Quay lại'}
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Settings;

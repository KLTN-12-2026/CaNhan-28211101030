import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

function FreelancerTopNav({ profile, username, notifications = [] }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    // Đóng menu khi click bên ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        if (window.confirm(t('common.logoutConfirm') || "Bạn có chắc chắn muốn đăng xuất không?")) {
            sessionStorage.clear();
            localStorage.clear();
            navigate('/');
        }
    };

    const userDisplayName = profile?.user_info?.last_name || profile?.user_info?.first_name
        ? `${profile.user_info.last_name || ''} ${profile.user_info.first_name || ''}`.trim()
        : profile?.full_name || username;

    const userAvatar = profile?.avatar || `https://ui-avatars.com/api/?name=${username}&background=006B5C&color=fff`;

    return (
        <nav className="fixed top-0 left-0 right-0 z-100 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800 shadow-xl shadow-teal-950/5 flex justify-between items-center px-6 py-3 font-['Inter'] antialiased transition-colors duration-200">
            {/* Left: Branding */}
            <div className="flex items-center gap-4">
                <span 
                    className="text-xl font-bold tracking-tighter text-teal-700 dark:text-teal-300 cursor-pointer" 
                    onClick={() => navigate('/freelancer')}
                >
                    FreelanceAI
                </span>
                <div className="hidden md:flex ml-8 gap-6"></div>
            </div>

            {/* Center: Contact Info */}
            <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-8">
                <a href="mailto:admin@freelanceai.vn" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer group">
                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-teal-50 dark:group-hover:bg-teal-950/50 flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                    </div>
                    <span className="text-sm font-bold tracking-tight">admin@freelanceai.vn</span>
                </a>
                <a href="tel:0123456789" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer group">
                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-teal-50 dark:group-hover:bg-teal-950/50 flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-[18px]">call</span>
                    </div>
                    <span className="text-sm font-bold tracking-tight">0123.456.789</span>
                </a>
            </div>

            {/* Right: Actions & User Menu */}
            <div className="flex items-center gap-4">
                {/* Notifications */}
                <button
                    onClick={() => navigate('/notifications')}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:bg-teal-50/50 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95 duration-200 relative"
                >
                    <span className="material-symbols-outlined">notifications</span>
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                    )}
                </button>

                {/* Theme Toggle */}
                <button 
                    onClick={toggleTheme}
                    title={isDark ? (t('common.lightMode') || "Chuyển sang chế độ sáng") : (t('common.darkMode') || "Chuyển sang chế độ tối")}
                    aria-label="Toggle theme"
                    className="p-2 text-slate-500 dark:text-slate-400 hover:bg-teal-50/50 dark:hover:bg-slate-800 rounded-full transition-all active:scale-95 duration-200 cursor-pointer flex items-center justify-center"
                >
                    <span className={`material-symbols-outlined transition-all duration-300 ${isDark ? 'text-amber-400 scale-110' : 'text-slate-600'}`}>
                        {isDark ? 'light_mode' : 'dark_mode'}
                    </span>
                </button>

                {/* Divider */}
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>

                {/* User Dropdown Profile - EXACTLY AS SCREENSHOT */}
                <div className="relative flex items-center gap-4 cursor-pointer group" ref={menuRef} onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <div className="flex flex-col items-end sm:flex">
                        <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                            {userDisplayName}
                        </span>
                        <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest mt-1">Freelancer</span>
                    </div>
                    
                    <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-teal-50 dark:border-teal-900/50 bg-slate-100 dark:bg-slate-800 hover:ring-2 hover:ring-teal-500/20 transition-all shadow-sm">
                        <img
                            alt="User Avatar"
                            className="w-full h-full object-cover"
                            src={userAvatar}
                        />
                    </div>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-110">
                            <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-800 mb-1">
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('common.account') || 'Tài khoản'}</p>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{userDisplayName}</p>
                            </div>
                            
                            <button 
                                onClick={() => { navigate('/profile'); setIsMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-800 hover:text-teal-700 dark:hover:text-teal-400 transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-xl opacity-60">person</span>
                                <span className="text-sm font-bold">{t('sidebar.profile') || 'Hồ sơ'}</span>
                            </button>
                            <button 
                                onClick={() => { navigate('/wallet'); setIsMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-800 hover:text-teal-700 dark:hover:text-teal-400 transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-xl opacity-60">account_balance_wallet</span>
                                <span className="text-sm font-bold">{t('dashboard.myWallet') || 'Ví của tôi'}</span>
                            </button>
                            <button 
                                onClick={() => { navigate('/my-ai-skills'); setIsMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-800 hover:text-teal-700 dark:hover:text-teal-400 transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-xl opacity-60">magic_button</span>
                                <span className="text-sm font-bold">AI Skill Analysis</span>
                            </button>
                            
                            <div className="h-px bg-slate-50 dark:bg-slate-800 my-1"></div>
                            
                            <button 
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-xl opacity-60">logout</span>
                                <span className="text-sm font-bold">{t('common.logout') || 'Đăng xuất'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default FreelancerTopNav;

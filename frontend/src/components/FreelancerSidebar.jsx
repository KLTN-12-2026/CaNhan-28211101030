import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useUnreadMessages } from '../hooks/useUnreadMessages';

function FreelancerSidebar({ handleLogout }) {
    const { t } = useTranslation();
    const location = useLocation();
    const unreadMessagesCount = useUnreadMessages();

    const menuItems = [
        { name: t('sidebar.dashboard'), icon: 'dashboard', path: '/freelancer' },
        { name: t('sidebar.aiSkills'), icon: 'psychology', path: '/my-ai-skills' },
        { name: t('sidebar.findJobs'), icon: 'search', path: '/find-jobs' },
        { name: t('sidebar.applications'), icon: 'description', path: '/applications' },
        { name: t('sidebar.messages'), icon: 'chat', path: '/chat' },
        { name: t('sidebar.learning'), icon: 'school', path: '/learning' },
        { name: t('sidebar.aiChat'), icon: 'smart_toy', path: '/ai-chat' },
        { name: t('sidebar.profile'), icon: 'account_circle', path: '/profile' },
    ];

    return (
        <aside className="h-screen w-64 fixed left-0 top-0 overflow-y-auto bg-slate-50 dark:bg-slate-900 flex flex-col pt-20 pb-6 z-40 md:flex border-r border-slate-200/50 dark:border-slate-800 font-['Inter'] transition-colors duration-200">
            <div className="px-6 mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-primary-container">psychology</span>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold tracking-tight text-on-surface dark:text-slate-100">FreelanceAI</h2>
                        <p className="text-[10px] text-on-surface-variant dark:text-slate-400 font-semibold uppercase tracking-wider">{t('sidebar.workspace')}</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 space-y-1">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const isMessages = item.path === '/chat';
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`flex items-center gap-3 px-6 py-3 transition-all duration-300 ease-in-out relative ${isActive
                                    ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-r-4 border-teal-500'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <div className="relative flex items-center justify-center">
                                <span className="material-symbols-outlined">{item.icon}</span>
                                {isMessages && unreadMessagesCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                                )}
                            </div>
                            <span className="text-sm font-semibold">{item.name}</span>
                            {isMessages && unreadMessagesCount > 0 && (
                                <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-black text-white bg-rose-500 rounded-full shadow-sm shadow-rose-500/40 animate-pulse">
                                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="px-6 mt-auto pt-6 border-t border-outline-variant/10 dark:border-slate-800 space-y-1">
                {/* Language Switcher */}
                <div className="px-4 py-2">
                    <button 
                        onClick={() => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}
                        className="w-full flex items-center gap-3 px-3 py-2 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all text-slate-900 dark:text-slate-100"
                    >
                        {i18n.language === 'vi' ? (
                            <>
                                <img src="https://flagcdn.com/w40/vn.png" alt="VN" className="w-5 h-3.5 object-cover rounded-sm" />
                                <span className="text-xs font-bold">Tiếng Việt</span>
                            </>
                        ) : (
                            <>
                                <img src="https://flagcdn.com/w40/us.png" alt="EN" className="w-5 h-3.5 object-cover rounded-sm" />
                                <span className="text-xs font-bold">English</span>
                            </>
                        )}
                    </button>
                </div>

                <Link className="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg" to="/settings">
                    <span className="material-symbols-outlined">settings</span>
                    <span className="text-sm font-semibold">{t('sidebar.settings')}</span>
                </Link>
                <a
                    href="#"
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                >
                    <span className="material-symbols-outlined">logout</span>
                    <span className="text-sm font-semibold">{t('sidebar.logout')}</span>
                </a>
            </div>
        </aside>
    );
}

export default FreelancerSidebar;

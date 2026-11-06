import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useUnreadMessages } from '../hooks/useUnreadMessages';

function ClientSidebar({ handleLogout }) {
    const { t } = useTranslation();
    const location = useLocation();
    const unreadMessagesCount = useUnreadMessages();

    // Danh sách menu
    const menuItems = [
        { name: t('sidebar.dashboard'), icon: 'dashboard', path: '/client' },
        { name: t('sidebar.postJob'), icon: 'add_circle', path: '/post-job' },
        { name: t('sidebar.myJobs'), icon: 'work', path: '/my-jobs' },
        { name: t('sidebar.messages'), icon: 'chat', path: '/chat' },
        { name: t('sidebar.companyProfile'), icon: 'domain', path: '/company' },
        { name: t('sidebar.talentPool'), icon: 'group', path: '/talent-pool' },
        { name: t('sidebar.aiChat'), icon: 'smart_toy', path: '/ai-chat' },
        { name: t('sidebar.settings'), icon: 'settings', path: '/settings' },
    ];

    return (
        <aside className="h-screen w-64 fixed left-0 top-0 pt-20 bg-slate-50 dark:bg-slate-900 flex flex-col border-r border-slate-200/50 dark:border-slate-800 font-['Inter'] text-sm font-medium md:flex z-40 transition-colors duration-200">
            <div className="px-6 py-4 flex flex-col gap-1">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const isMessages = item.path === '/chat';
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 transition-all duration-300 ease-in-out relative ${isActive
                                ? 'text-teal-700 dark:text-teal-400 border-r-4 border-teal-500 bg-teal-50/50 dark:bg-teal-950/40'
                                : 'text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <div className="relative flex items-center justify-center">
                                <span className="material-symbols-outlined">{item.icon}</span>
                                {isMessages && unreadMessagesCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                                )}
                            </div>
                            <span>{item.name}</span>
                            {isMessages && unreadMessagesCount > 0 && (
                                <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-black text-white bg-rose-500 rounded-full shadow-sm shadow-rose-500/40 animate-pulse">
                                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>

            <div className="mt-auto px-6 py-6 space-y-2">
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

                <a
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 ease-in-out cursor-pointer"
                    href="#"
                >
                    <span className="material-symbols-outlined">logout</span>
                    <span>{t('sidebar.logout')}</span>
                </a>
            </div>
        </aside>
    );
}

export default ClientSidebar;

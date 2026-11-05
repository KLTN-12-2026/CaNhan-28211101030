import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import ClientSidebar from '../components/ClientSidebar';
import FreelancerSidebar from '../components/FreelancerSidebar';
import FreelancerTopNav from '../components/FreelancerTopNav';
import ClientTopNav from '../components/ClientTopNav';

function Notifications() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const userId = sessionStorage.getItem('user_id');

    const [company, setCompany] = useState(null);
    const [freelancer, setFreelancer] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const role = sessionStorage.getItem('user_role');

    const handleLogout = (e) => {
        if (e) e.preventDefault();
        if (window.confirm(t('common.logoutConfirm') || "Bạn có chắc chắn muốn đăng xuất không?")) {
            sessionStorage.clear();
            localStorage.clear();
            navigate('/');
        }
    };

    const timeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return t('notifications.time.justNow') || 'Vừa xong';
        if (diffInSeconds < 3600) return t('notifications.time.minutesAgo', { count: Math.floor(diffInSeconds / 60) }) || `${Math.floor(diffInSeconds / 60)} phút trước`;
        if (diffInSeconds < 86400) return t('notifications.time.hoursAgo', { count: Math.floor(diffInSeconds / 3600) }) || `${Math.floor(diffInSeconds / 3600)} giờ trước`;
        if (diffInSeconds < 172800) return t('notifications.time.yesterday') || 'Hôm qua';
        return t('notifications.time.daysAgo', { count: Math.floor(diffInSeconds / 86400) }) || `${Math.floor(diffInSeconds / 86400)} ngày trước`;
    };

    const getNotificationStyle = (type) => {
        switch (type) {
            case 'match':
                return { icon: 'star', colorClass: 'bg-emerald-100 text-emerald-600' };
            case 'application':
                return { icon: 'person_add', colorClass: 'bg-blue-100 text-blue-600' };
            case 'job':
                return { icon: 'work', colorClass: 'bg-teal-100 text-teal-800' };
            case 'system':
            default:
                return { icon: 'verified_user', colorClass: 'bg-slate-100 text-slate-600' };
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [companyRes, freelancerRes, notifRes] = await Promise.all([
                    api.get('companies/'),
                    api.get('freelancers/'),
                    api.get('notifications/')
                ]);

                if (role === 'client') {
                    const allCompanies = companyRes.data.results || companyRes.data;
                    const currentCompany = allCompanies.find(c => String(c.user) === String(userId));
                    if (currentCompany) setCompany(currentCompany);
                } else {
                    const allFreelancers = freelancerRes.data.results || freelancerRes.data;
                    const currentFreelancer = allFreelancers.find(f => String(f.user) === String(userId));
                    if (currentFreelancer) setFreelancer(currentFreelancer);
                }

                const allNotifs = notifRes.data.results || notifRes.data;
                setNotifications(allNotifs);

            } catch (error) {
                console.error("Lỗi khi tải dữ liệu:", error);
            } finally {
                setLoading(false);
            }
        };

        if (userId) fetchData();
        else setLoading(false);
    }, [userId, role]);

    const markAsRead = async (id) => {
        try {
            await api.patch(`notifications/${id}/`, { is_read: true });
            setNotifications(prev =>
                prev.map(notif => notif.id === id ? { ...notif, is_read: true } : notif)
            );
        } catch (error) {
            console.error("Lỗi cập nhật trạng thái:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            // Giả định backend có endpoint hoặc lặp qua các thông báo chưa đọc
            const unread = notifications.filter(n => !n.is_read);
            await Promise.all(unread.map(n => api.patch(`notifications/${n.id}/`, { is_read: true })));
            setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
        } catch (err) {
            console.error("Failed to mark all as read", err);
        }
    };

    if (loading) return <div className="flex justify-center items-center min-h-screen text-teal-700 font-bold">{t('notifications.loading') || 'Đang tải thông báo...'}</div>;

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="bg-[#f8fafc] font-body text-slate-900 min-h-screen flex">
            {role === 'client' ? (
                <ClientSidebar companyName={company?.company_name} handleLogout={handleLogout} />
            ) : (
                <FreelancerSidebar profile={freelancer} username={sessionStorage.getItem('username')} handleLogout={handleLogout} />
            )}

            <div className="flex-1 flex flex-col min-h-screen md:pl-64">
                {role === 'client' ? (
                    <ClientTopNav company={company} username={sessionStorage.getItem('username')} notifications={notifications} />
                ) : (
                    <FreelancerTopNav profile={freelancer} username={sessionStorage.getItem('username')} notifications={notifications} />
                )}

                <main className="pt-24 pb-20 px-6 md:px-10 max-w-7xl mx-auto flex flex-col lg:flex-row gap-10 w-full">
                    <div className="flex-1">
                        <div className="mb-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => navigate(role === 'client' ? '/client' : '/freelancer')}
                                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                        <span className="material-symbols-outlined">arrow_back</span>
                                    </button>
                                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">{t('notifications.title') || 'Thông báo'}</h1>
                                </div>
                                <button onClick={markAllAsRead} className="text-emerald-600 font-semibold text-sm hover:underline flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">done_all</span> {t('notifications.markAllRead') || 'Đánh dấu tất cả đã đọc'}
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button className="px-6 py-2 bg-emerald-600 text-white rounded-full text-sm font-medium">{t('notifications.all') || 'Tất cả'}</button>
                                <button className="px-6 py-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-full text-sm font-medium transition-colors">
                                    {t('notifications.unread') || 'Chưa đọc'} ({unreadCount})
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {notifications.length > 0 ? (
                                notifications.map(notif => {
                                    const style = getNotificationStyle(notif.notification_type);

                                    return (
                                        <div
                                            key={notif.id}
                                            onClick={() => markAsRead(notif.id)}
                                            className={`group relative p-6 rounded-2xl border transition-all flex gap-5 items-start cursor-pointer ${notif.is_read ? 'bg-white opacity-70 border-slate-100' : 'bg-white border-emerald-500/20 shadow-sm'}`}
                                        >
                                            {!notif.is_read && (
                                                <div className="absolute top-6 right-6 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                            )}

                                            <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${style.colorClass}`}>
                                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{style.icon}</span>
                                            </div>

                                            <div className="flex-1">
                                                <h3 className={`text-lg mb-1 ${notif.is_read ? 'font-semibold text-slate-500' : 'font-bold text-slate-800'}`}>
                                                    {notif.title || t('notifications.newNotification')}
                                                </h3>
                                                <p className="text-slate-600 text-sm leading-relaxed mb-3">
                                                    {notif.message}
                                                </p>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                    {timeAgo(notif.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                                    <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">notifications_off</span>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">{t('notifications.noNotifications') || 'Không có thông báo'}</h3>
                                    <p className="text-slate-400">{t('notifications.noNotificationsSubtitle') || 'Chúng tôi sẽ thông báo cho bạn khi có tin mới.'}</p>
                                </div>
                            )}
                        </div>
                    </div>


                </main>
            </div>
        </div>
    );
}

export default Notifications;

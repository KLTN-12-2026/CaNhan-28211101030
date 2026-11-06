import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReviewModal from '../components/ReviewModal';
import FreelancerSidebar from '../components/FreelancerSidebar';
import FreelancerTopNav from '../components/FreelancerTopNav';
import api from '../api';

import { toast } from 'react-hot-toast';
function FreelancerDashboard() {

    // Hooks phải được khai báo ở đầu component
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Hàm Đăng xuất
    const handleLogout = (e) => {
        e.preventDefault();
        const isConfirm = window.confirm(t('common.logoutConfirm'));
        if (isConfirm) {
            sessionStorage.clear();
            navigate('/');
        }
    };

    // 1. KHỞI TẠO STATE ĐỂ LƯU DỮ LIỆU TỪ BACKEND
    const [profile, setProfile] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [companies, setCompanies] = useState([]); // THÊM STATE
    const [wallet, setWallet] = useState(null); // THÊM STATE WALLET

    const [reviewModal, setReviewModal] = useState({
        isOpen: false,
        job: null,
        revieweeId: null,
        revieweeName: ''
    });

    const username = sessionStorage.getItem('username') || 'Freelancer';
    const currentUserId = sessionStorage.getItem('user_id');

    const applyDashboardData = useCallback((dashboardData) => {
        const {
            myProfile,
            activeJobs,
            nextApplications,
            nextNotifications,
            nextCompanies,
            nextWallet
        } = dashboardData;

        if (myProfile) {
            setProfile(myProfile);
        }

        setJobs(activeJobs);
        setApplications(nextApplications);
        setNotifications(nextNotifications);
        setCompanies(nextCompanies);

        if (nextWallet) {
            setWallet(nextWallet);
        }
    }, []);

    const fetchDashboardData = useCallback(async () => {
        try {
            const [profileRes, jobsRes, appsRes, notifRes, companiesRes, walletRes] = await Promise.all([
                api.get('freelancers/'),
                api.get('jobs/'),
                api.get('applications/').catch(() => ({ data: { results: [] } })),
                api.get('notifications/').catch(() => ({ data: { results: [] } })),
                api.get('companies/').catch(() => ({ data: { results: [] } })),
                api.get('payments/wallet/').catch(() => ({ data: null }))
            ]);

            const allProfiles = profileRes.data.results || profileRes.data;
            const myProfile = allProfiles.find(p => String(p.user) === String(currentUserId));

            return {
                myProfile,
                activeJobs: (jobsRes.data.results || jobsRes.data).filter(job => job.is_active),
                nextApplications: appsRes.data.results || appsRes.data || [],
                nextNotifications: notifRes.data.results || notifRes.data || [],
                nextCompanies: companiesRes.data.results || companiesRes.data || [],
                nextWallet: walletRes?.data
            };
        } catch (error) {
            console.error("❌ Lỗi khi tải dữ liệu Dashboard:", error);
            return null;
        }
    }, [currentUserId]);

    // 2. GỌI API LẤY DỮ LIỆU THẬT & CƠ CHẾ CACHE
    useEffect(() => {
        if (!currentUserId) return;

        let isActive = true;
        const cacheKey = `freelancer_dashboard_${currentUserId}`;
        const cached = sessionStorage.getItem(cacheKey);

        if (cached) {
            try {
                applyDashboardData(JSON.parse(cached));
            } catch (e) {
                console.error("Cache parse error", e);
            }
        }

        fetchDashboardData().then((dashboardData) => {
            if (isActive && dashboardData) {
                applyDashboardData(dashboardData);
                sessionStorage.setItem(cacheKey, JSON.stringify(dashboardData));
            }
        });

        return () => {
            isActive = false;
        };
    }, [currentUserId, fetchDashboardData, applyDashboardData]);

    // 3. XỬ LÝ CÁC BIẾN ĐỂ HIỂN THỊ
    // Dynamic computations for UI
    const myApplications = profile ? applications.filter(a => String(a.freelancer) === String(profile.id)) : [];
    const jobsApplied = myApplications.length;
    const avgMatch = jobsApplied > 0
        ? Math.round(myApplications.reduce((acc, curr) => acc + (curr.matching_score || 0), 0) / jobsApplied)
        : 0;

    // Filter jobs that haven't been applied to yet and limit to top 3
    const appliedJobIds = new Set(myApplications.map(a => a.job));
    const recommendedJobs = jobs.filter(j => !appliedJobIds.has(j.id)).slice(0, 3);

    const skillsImproved = (profile?.work_experiences?.length || 0) + (profile?.educations?.length || 0) + (profile?.skill_list?.length || 0);


    const handleApply = async (jobId) => {
        try {
            const profileId = profile?.id;
            if (!profileId) {
                toast.error(t('findJobs.completeProfile') || "Vui lòng cập nhật hồ sơ trước khi ứng tuyển.");
                return;
            }

            if (!profile.user_info?.is_email_verified) {
                toast.error(t('findJobs.verifyEmail') || "Vui lòng xác minh email trước khi ứng tuyển.");
                return;
            }

            const res = await api.post(`jobs/${jobId}/calculate_match/`, { freelancer_id: profileId });
            toast.success(res.data.message || "Ứng tuyển thành công!");
            const dashboardData = await fetchDashboardData();
            if (dashboardData) {
                applyDashboardData(dashboardData);
            }
        } catch (error) {
            console.error("Error applying:", error);
            toast.error(error.response?.data?.error || "Có lỗi khi ứng tuyển.");
        }
    };

    // Tính toán vòng cung cho AI Overall Score
    const overallScore = profile?.ai_score || 0;
    const calculateDashOffset = (score) => {
        const circumference = 552.9; // 2 * pi * r (với r=88)
        return circumference - (circumference * score) / 100;
    };
    const circleOffset = calculateDashOffset(overallScore);

    return (
        <div className="bg-surface text-on-surface overflow-x-hidden min-h-screen">
            <FreelancerTopNav profile={profile} username={username} notifications={notifications} />


            {/* SideNavBar */}
            <FreelancerSidebar profile={profile} username={username} handleLogout={handleLogout} />

            {/* Main Content Canvas */}
            <main className="md:ml-64 pt-24 px-8 pb-12">
                <div className="max-w-400 mx-auto">
                    {/* Header Section */}
                    <header className="mb-12">
                        <p className="label-sm text-primary font-bold tracking-widest uppercase mb-2">{t('common.welcomeBack')}</p>
                        <h1 className="text-4xl font-extrabold tracking-tight text-on-surface">
                            {/* DÙNG DỮ LIỆU TỪ API, FALLBACK VỀ USERNAME */}
                            {t('common.hello')} {profile?.user_info?.first_name || profile?.full_name || username}
                        </h1>
                    </header>

                    {/* Three Column Bento Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">

                        {/* Left Column: AI Score & Stats */}
                        <div className="lg:col-span-3 space-y-8">
                            <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16"></div>
                                <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-tighter mb-6">{t('dashboard.aiScore')}</h3>
                                <div className="relative flex items-center justify-center w-48 h-48 mb-6">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle className="text-surface-container-high" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="8"></circle>
                                        <circle className="text-primary" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeDasharray="552.9" strokeDashoffset={circleOffset} strokeLinecap="round" strokeWidth="12"></circle>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        {/* IN RA ĐIỂM SỐ DYNAMIC */}
                                        <span className="text-5xl font-extrabold tracking-tighter text-on-surface">{overallScore}%</span>
                                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Tier 1</span>
                                    </div>
                                </div>
                                <div className="bg-primary-container/20 text-on-primary-container px-4 py-1.5 rounded-full text-xs font-bold">
                                    {t('dashboard.excellentMatch')}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-surface-container-low p-6 rounded-lg border-l-4 border-primary">
                                    <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">{t('dashboard.jobsApplied')}</p>
                                    <p className="text-2xl font-black text-on-surface">{jobsApplied}</p>
                                </div>
                                <div className="bg-surface-container-low p-6 rounded-lg border-l-4 border-secondary">
                                    <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">{t('dashboard.avgMatch')}</p>
                                    <p className="text-2xl font-black text-on-surface">{avgMatch}%</p>
                                </div>
                                <div className="bg-surface-container-low p-6 rounded-lg border-l-4 border-tertiary">
                                    <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">{t('dashboard.profileItems')}</p>
                                    <div className="flex items-end gap-2">
                                        <p className="text-2xl font-black text-on-surface">{skillsImproved}</p>
                                        <span className="text-xs text-primary font-bold mb-1">{t('dashboard.updated')}</span>
                                    </div>
                                </div>

                                {/* Wallet Card */}
                                <div className="bg-linear-to-br from-teal-600 to-emerald-600 p-6 rounded-2xl shadow-lg cursor-pointer hover:scale-[1.02] transition-transform text-white" onClick={() => navigate('/wallet')}>
                                    <div className="flex justify-between items-start mb-4">
                                        <p className="text-[10px] font-black text-white/80 uppercase tracking-widest">{t('dashboard.myWallet')}</p>
                                        <span className="material-symbols-outlined text-white text-sm">account_balance_wallet</span>
                                    </div>
                                    <p className="text-2xl font-black text-white">${parseFloat(wallet?.balance || 0).toFixed(2)}</p>
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-white/90">{wallet?.ai_credits || 0} AI Credits</span>
                                        <span className="text-[10px] font-bold text-white bg-white/20 px-2 py-0.5 rounded">{t('dashboard.viewDetails')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Center Column: Radar & Analysis */}
                        <div className="lg:col-span-5 space-y-8">
                            <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm h-full flex flex-col" style={{ backgroundImage: 'radial-gradient(circle, #bbcac4 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                                <div className="flex justify-between items-start mb-8">
                                    <h3 className="text-xl font-bold tracking-tight text-on-surface">{t('dashboard.aiSkillEval')}</h3>
                                    <span className="material-symbols-outlined text-primary">info</span>
                                </div>

                                {/* Radar Chart removed - replaced by actual Skill Chips UI */}
                                <div className="flex-1 flex flex-col justify-center min-h-75 relative z-10">
                                    {profile?.ai_summary_report ? (
                                        <div className="bg-white/90 dark:bg-slate-800/90 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6 relative">
                                            <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg">
                                                <span className="material-symbols-outlined text-sm">smart_toy</span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed italic">
                                                "{profile.ai_summary_report}"
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center mb-6">
                                            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">analytics</span>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có đánh giá từ AI. Vui lòng cập nhật chi tiết hồ sơ.</p>
                                        </div>
                                    )}

                                    <div className="bg-white/80 dark:bg-slate-800/80 p-5 rounded-xl backdrop-blur-sm border border-slate-100 dark:border-slate-700/50">
                                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm text-primary">verified</span>
                                            Kỹ năng đã xác thực
                                        </p>
                                        
                                        <div className="flex flex-wrap gap-2">
                                            {profile?.skill_list && profile.skill_list.length > 0 ? (
                                                profile.skill_list.map((skill, idx) => (
                                                    <span 
                                                        key={idx} 
                                                        className="px-4 py-2 bg-surface-container-highest text-on-surface-variant rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm hover:border-primary hover:text-primary transition-colors cursor-default"
                                                    >
                                                        {skill}
                                                    </span>
                                                ))
                                            ) : (
                                                <p className="text-sm text-slate-500 dark:text-slate-400 italic">Hồ sơ chưa cập nhật kỹ năng.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Recommended Jobs */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="flex justify-between items-end px-2">
                                <h3 className="text-xl font-bold tracking-tight">{t('dashboard.recommendedJobs')}</h3>
                                <a className="text-sm font-bold text-primary hover:underline" href="#" onClick={(e) => { e.preventDefault(); navigate('/find-jobs'); }}>{t('dashboard.viewAll')}</a>
                            </div>
                            <div className="space-y-4">

                                {/* MAP DỮ LIỆU JOB TỪ DATABASE VỚI ĐÚNG UI THIẾT KẾ CỦA CARD 1 */}
                                {recommendedJobs.length > 0 ? recommendedJobs.map((job) => {
                                    const mScore = job.matching_score || 0;
                                    return (
                                        <div key={job.id} className="bg-surface-container-lowest p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow group">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">{job.title}</h4>
                                                    <p className="text-xs text-on-surface-variant font-medium mt-1">Ngân sách: {Number(job.budget).toLocaleString('vi-VN')} VNĐ</p>
                                                </div>
                                                <div className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-tighter ${mScore >= 80 ? 'bg-emerald-500 text-white' :
                                                    mScore >= 50 ? 'bg-amber-100 text-amber-700' :
                                                        'bg-rose-100 text-rose-700'
                                                    }`}>
                                                    {mScore}% Match
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="flex items-center gap-1 text-on-surface-variant">
                                                    <span className="material-symbols-outlined text-sm">payments</span>
                                                    <span className="text-xs font-bold">Thỏa thuận</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-on-surface-variant">
                                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                                    <span className="text-xs font-bold">Dự án mới</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleApply(job.id)}
                                                    className="flex-1 py-3 bg-linear-to-r from-primary to-primary-container text-white font-bold text-sm rounded-full active:scale-95 transition-transform"
                                                >
                                                    Apply Now
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/chat?user_id=${job.company?.user}`)}
                                                    className="p-3 rounded-full border border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all active:scale-95"
                                                >
                                                    <span className="material-symbols-outlined text-lg">chat</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <p className="text-sm text-slate-500 text-center py-4">Đang tìm kiếm công việc phù hợp...</p>
                                )}

                            </div>
                        </div>
                    </div>

                    {/* Bottom Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Recent Activity Feed */}
                        <div className="space-y-12">
                            <section>
                                <h3 className="text-2xl font-black tracking-tight px-2 mb-6">{t('dashboard.recentActivity')}</h3>
                                <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm space-y-6">
                                    {notifications.length > 0 ? notifications.slice(0, 3).map((notif) => (
                                        <div key={notif.id} className="flex gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.notification_type === 'match' ? 'bg-primary/10' : 'bg-secondary/10'}`}>
                                                <span className={`material-symbols-outlined ${notif.notification_type === 'match' ? 'text-primary' : 'text-secondary'}`}>
                                                    {notif.notification_type === 'match' ? 'check_circle' : 'military_tech'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-on-surface">{notif.title}</p>
                                                <p className="text-xs text-on-surface-variant">{notif.message}</p>
                                                <span className="text-[10px] font-bold text-outline uppercase tracking-widest mt-1 block">
                                                    {new Date(notif.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-sm text-slate-500 text-center py-4">Chưa có hoạt động nào gần đây.</p>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Client Reviews */}
                        <div className="space-y-12">
                            <section>
                                <h3 className="text-2xl font-black tracking-tight px-2 mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-amber-500">star</span>
                                    {t('dashboard.clientReviews')}
                                </h3>
                                <div className="space-y-4">
                                    {myApplications.filter(app => app.status === 'Accepted').length > 0 ? (
                                        myApplications.filter(app => app.status === 'Accepted').map(app => {
                                            const jobObj = jobs.find(j => j.id === app.job);
                                            const companyObj = companies.find(c => String(c.id) === String(jobObj?.client));
                                            return (
                                                <div key={app.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between shadow-sm">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate">{companyObj?.company_name || 'Client'}</h4>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Dự án: {jobObj?.title}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setReviewModal({
                                                            isOpen: true,
                                                            job: jobObj,
                                                            revieweeId: companyObj?.user,
                                                            revieweeName: companyObj?.company_name
                                                        })}
                                                        className="ml-4 px-4 py-2 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold rounded-full text-[10px] hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-all uppercase tracking-wider cursor-pointer"
                                                    >
                                                        Đánh giá
                                                    </button>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-sm text-slate-400 italic px-2">Chưa có dự án nào cần đánh giá.</p>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </main>

            {/* FAB Action Button */}
            <button
                onClick={() => navigate('/ai-chat')}
                className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
            >
                <span className="material-symbols-outlined">smart_toy</span>
            </button>

            {/* Review Modal */}
            <ReviewModal
                isOpen={reviewModal.isOpen}
                onClose={() => setReviewModal({ ...reviewModal, isOpen: false })}
                job={reviewModal.job}
                revieweeId={reviewModal.revieweeId}
                revieweeName={reviewModal.revieweeName}
                onSuccess={() => toast.success("Cảm ơn bạn đã đánh giá!")}
            />
        </div>
    );
}

export default FreelancerDashboard;

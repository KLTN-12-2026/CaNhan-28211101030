import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ClientSidebar from '../components/ClientSidebar';
import ClientTopNav from '../components/ClientTopNav';
import ReviewModal from '../components/ReviewModal';
import api from '../api';

import { toast } from 'react-hot-toast';
function ClientDashboard() {
    const { t } = useTranslation();
    const [company, setCompany] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]); 
    const [loading, setLoading] = useState(true);

    const [reviewModal, setReviewModal] = useState({
        isOpen: false,
        job: null,
        revieweeId: null,
        revieweeName: ''
    });

    const navigate = useNavigate();
    const userId = sessionStorage.getItem('user_id');

    const handleLogout = (e) => {
        if (e) e.preventDefault();
        const isConfirm = window.confirm(t('common.logoutConfirm') || "Bạn có chắc chắn muốn đăng xuất không?");
        if (isConfirm) {
            sessionStorage.clear();
            navigate('/');
        }
    };

    useEffect(() => {
        const fetchClientData = async () => {
            try {
                const [companyRes, jobsRes, appsRes] = await Promise.all([
                    api.get('companies/'),
                    api.get('jobs/'),
                    api.get('applications/')
                ]);

                const allCompanies = companyRes.data.results || companyRes.data;
                const myCompany = allCompanies.find(c => String(c.user) === String(userId));

                let clientJobs = [];
                if (myCompany) {
                    const allJobs = jobsRes.data.results || jobsRes.data;
                    clientJobs = allJobs.filter(job => {
                        const jobClientId = typeof job.client === 'object' ? job.client?.id : job.client;
                        return String(jobClientId) === String(myCompany.id);
                    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                }

                const clientApps = appsRes.data.results || appsRes.data;

                const data = {
                    company: myCompany || null,
                    jobs: clientJobs,
                    applications: clientApps
                };

                setCompany(data.company);
                setJobs(data.jobs);
                setApplications(data.applications);
                sessionStorage.setItem(`client_dashboard_${userId}`, JSON.stringify(data));
            } catch (error) {
                console.error("Lỗi tải dữ liệu Client:", error);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            const cacheKey = `client_dashboard_${userId}`;
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const data = JSON.parse(cached);
                    setCompany(data.company);
                    setJobs(data.jobs);
                    setApplications(data.applications);
                    setLoading(false);
                } catch(e) {}
            }
            fetchClientData();
        } else {
            setLoading(false);
        }
    }, [userId]);

    // Calculate Dynamic Stats
    const totalSpent = applications
        .filter(app => ['Accepted', 'Hired'].includes(app.status))
        .reduce((sum, app) => {
            const job = jobs.find(j => String(j.id) === String(app.job));
            return sum + (job ? Number(job.budget) : 0);
        }, 0);

    const jobApps = applications.filter(app => jobs.some(j => String(j.id) === String(app.job)));
    const avgMatchAll = jobApps.length > 0 
        ? Math.round(jobApps.reduce((sum, app) => sum + (app.matching_score || 0), 0) / jobApps.length)
        : 0;

    const newApps24h = jobApps.filter(app => {
        const diff = new Date() - new Date(app.created_at);
        return diff < 24 * 60 * 60 * 1000;
    }).length;

    if (loading) return <div className="flex items-center justify-center min-h-screen font-bold text-teal-700">{t('clientDashboard.loadingDashboard') || "Đang tải trang quản trị..."}</div>;

    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen">
            <ClientTopNav company={company} username={sessionStorage.getItem('username')} notifications={[]} />
            <ClientSidebar companyName={company?.company_name} handleLogout={handleLogout} />

            <main className="md:ml-64 pt-24 pb-20 px-10 min-h-screen">
                <div className="grid grid-cols-12 gap-10">

                    {/* Left Column: Welcome & Stats */}
                    <div className="col-span-12 lg:col-span-3 flex flex-col gap-8">
                        <header>
                            <h1 className="text-3xl font-extrabold tracking-tight text-on-surface mb-1">
                                {t('clientDashboard.welcome') || "Chào mừng,"} {company?.company_name || t('clientDashboard.valuedClient') || "Quý đối tác"}
                            </h1>
                            <p className="text-on-surface-variant body-lg">{t('clientDashboard.overview') || "Đây là tổng quan dự án của bạn."}</p>
                        </header>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm border-l-4 border-primary">
                                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('clientDashboard.activeJobs') || "Công việc đang tuyển"}</span>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <span className="text-3xl font-black text-on-surface">{jobs.length}</span>
                                    <span className="text-primary text-xs font-medium">{t('clientDashboard.liveNow') || "đang bật"}</span>
                                </div>
                            </div>
                            <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm border-l-4 border-secondary">
                                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('clientDashboard.totalSpent') || "Tổng chi trả"}</span>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <span className="text-3xl font-black text-on-surface">{totalSpent >= 1000000 ? `${(totalSpent / 1000000).toFixed(1)}M` : totalSpent.toLocaleString('vi-VN')}</span>
                                    <span className="text-secondary text-xs font-medium">{t('clientDashboard.vnd') || "VNĐ"}</span>
                                </div>
                            </div>
                            <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm border-l-4 border-tertiary-container">
                                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('clientDashboard.avgMatch') || "Độ phù hợp TB"}</span>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <span className="text-3xl font-black text-on-surface">{avgMatchAll}%</span>
                                </div>
                            </div>
                            <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm border-l-4 border-primary-container">
                                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('clientDashboard.newApps') || "Ứng tuyển mới"}</span>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <span className="text-3xl font-black text-on-surface">{newApps24h}</span>
                                    <span className="text-primary-container text-xs font-medium">{t('clientDashboard.last24h') || "24h qua"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Center Column: Active Postings & Pending Reviews */}
                    <div className="col-span-12 lg:col-span-9 space-y-12">
                          <section>
                             <div className="flex items-center justify-between mb-8">
                                 <h2 className="text-2xl font-black text-on-surface">{t('clientDashboard.activePostings') || "Tin tuyển dụng đang hoạt động"}</h2>
                                 <button onClick={() => navigate('/my-jobs')} className="text-primary font-bold text-sm flex items-center gap-1 hover:underline">
                                     {t('clientDashboard.viewAll') || "Xem tất cả"} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                 </button>
                             </div>
                             <div className="grid grid-cols-1 gap-6">
                                 {jobs.length > 0 ? jobs.slice(0, 3).map((job) => (
                                     <div key={job.id} className="bg-surface-container-lowest p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow group cursor-pointer" onClick={() => navigate('/my-jobs')}>
                                         <div className="flex justify-between items-start mb-4">
                                             <div>
                                                 <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{job.title}</h3>
                                                 <div className="flex gap-2 mt-2">
                                                     <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tight">Active</span>
                                                     <span className="bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full text-xs font-medium">{job.category || 'IT'}</span>
                                                 </div>
                                             </div>
                                              <div className="bg-primary/5 p-3 rounded-xl text-center min-w-20">
                                                 <p className="text-[10px] font-bold text-primary uppercase">{t('clientDashboard.avgMatch') || "Match TB"}</p>
                                                 <p className="text-xl font-black text-primary">
                                                     {(() => {
                                                         const apps = applications.filter(a => String(a.job) === String(job.id));
                                                         if (apps.length === 0) return '0%';
                                                         const avg = apps.reduce((sum, a) => sum + (a.matching_score || 0), 0) / apps.length;
                                                         return `${Math.round(avg)}%`;
                                                     })()}
                                                 </p>
                                             </div>
                                         </div>
                                         <div className="grid grid-cols-3 gap-4 border-t border-surface-container-low pt-6">
                                             <div>
                                                 <p className="text-xs text-on-surface-variant font-medium">{t('clientDashboard.budget') || "Ngân sách"}</p>
                                                 <p className="text-base font-bold text-on-surface">{Number(job.budget).toLocaleString('vi-VN')} {t('clientDashboard.vnd') || "VNĐ"}</p>
                                             </div>
                                             <div>
                                                 <p className="text-xs text-on-surface-variant font-medium">{t('clientDashboard.applicants') || "Hồ sơ"}</p>
                                                 <p className="text-base font-bold text-on-surface">{job.application_count || 0} {t('clientDashboard.applicantsCount') || "Ứng viên"}</p>
                                             </div>
                                             <div>
                                                 <p className="text-xs text-on-surface-variant font-medium">{t('clientDashboard.postDate') || "Ngày đăng"}</p>
                                                 <p className="text-base font-bold text-on-surface">{new Date(job.created_at || Date.now()).toLocaleDateString(t('common.locale') || 'vi-VN')}</p>
                                             </div>
                                         </div>
                                     </div>
                                 )) : (
                                     <div className="bg-white p-10 rounded-lg border-2 border-dashed border-slate-200 text-center text-slate-400">
                                         {t('clientDashboard.noJobs') || "Chưa có tin tuyển dụng nào."}
                                     </div>
                                 )}
                             </div>
                         </section>
 
                         {/* PROJECTS TO REVIEW SECTION */}
                         <section>
                             <h2 className="text-2xl font-black text-on-surface mb-6 flex items-center gap-2">
                                 <span className="material-symbols-outlined text-amber-500">star</span>
                                 {t('clientDashboard.evaluateFreelancer') || "Đánh giá Freelancer"}
                             </h2>
                             <div className="space-y-4">
                                 {applications.filter(app => app.status === 'Accepted' && jobs.some(j => j.id === app.job)).length > 0 ? (
                                     applications.filter(app => app.status === 'Accepted' && jobs.some(j => j.id === app.job)).map(app => {
                                         const jobObj = jobs.find(j => j.id === app.job);
                                         return (
                                             <div key={app.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                                                 <div className="flex items-center gap-4">
                                                     <img src={app.freelancer_info?.avatar || "https://lh3.googleusercontent.com/a/default-user"} className="w-12 h-12 rounded-full object-cover" alt="" />
                                                     <div>
                                                         <h4 className="font-bold text-slate-800">{app.freelancer_info?.full_name}</h4>
                                                         <p className="text-xs text-slate-500">{t('common.projectLabel') || "Dự án"}: {jobObj?.title}</p>
                                                     </div>
                                                 </div>
                                                 <button
                                                     onClick={() => setReviewModal({
                                                         isOpen: true,
                                                         job: jobObj,
                                                         revieweeId: app.freelancer_info?.user,
                                                         revieweeName: app.freelancer_info?.full_name
                                                     })}
                                                     className="px-6 py-2 bg-amber-100 text-amber-700 font-bold rounded-full text-xs hover:bg-amber-200 transition-all"
                                                 >
                                                     {t('clientDashboard.evaluateNow') || "Đánh giá ngay"}
                                                 </button>
                                             </div>
                                         );
                                     })
                                 ) : (
                                     <p className="text-sm text-slate-400 italic">{t('clientDashboard.noReviews') || "Chưa có dự án nào cần đánh giá."}</p>
                                 )}
                             </div>
                         </section>
 
                         {/* Recent Activity Feed */}
                          <section className="mt-12">
                             <h2 className="text-2xl font-black text-on-surface mb-6">{t('clientDashboard.recentActivity') || "Hoạt động gần đây"}</h2>
                             <div className="bg-surface-container-low rounded-lg p-6 flex flex-col gap-6">
                                 {jobApps.length > 0 ? jobApps.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4).map(app => {
                                     const jobObj = jobs.find(j => String(j.id) === String(app.job));
                                     return (
                                         <div key={app.id} className="flex gap-4">
                                             <div className="bg-primary/20 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                                                 <span className="material-symbols-outlined text-primary text-xl">person_add</span>
                                             </div>
                                             <div>
                                                 <p className="text-sm font-semibold">{app.freelancer_info?.full_name} ứng tuyển vào <span className="text-primary font-bold">{jobObj?.title}</span></p>
                                                 <p className="text-xs text-on-surface-variant mt-1">{new Date(app.created_at).toLocaleDateString('vi-VN', {hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'})}</p>
                                             </div>
                                         </div>
                                     );
                                 }) : (
                                     <p className="text-sm text-slate-500 italic">Chưa có ứng viên nào.</p>
                                 )}
                             </div>
                         </section>
                     </div>
                </div>
            </main>

            <button onClick={() => navigate('/post-job')} className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-linear-to-br from-primary to-primary-container text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform z-50">
                <span className="material-symbols-outlined">add</span>
            </button>
            <ReviewModal
                isOpen={reviewModal.isOpen}
                onClose={() => setReviewModal({ ...reviewModal, isOpen: false })}
                job={reviewModal.job}
                revieweeId={reviewModal.revieweeId}
                revieweeName={reviewModal.revieweeName}
                onSuccess={() => toast.success(t('clientDashboard.reviewSuccess') || "Gửi đánh giá thành công!")}
            />
        </div>
    );
}

export default ClientDashboard;
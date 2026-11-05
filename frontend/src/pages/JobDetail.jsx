import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import FreelancerSidebar from '../components/FreelancerSidebar';
import FreelancerTopNav from '../components/FreelancerTopNav';

import { toast } from 'react-hot-toast';
const JobDetail = () => {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [freelancerProfile, setFreelancerProfile] = useState(null);
    const [applications, setApplications] = useState([]);
    const [appsLoaded, setAppsLoaded] = useState(false);
    const [showProposalModal, setShowProposalModal] = useState(false);
    const [bidAmount, setBidAmount] = useState('');
    const [coverLetter, setCoverLetter] = useState('');

    const fetchApplications = useCallback(async () => {
        try {
            const res = await api.get('applications/');
            setApplications(res.data.results || res.data);
            setAppsLoaded(true);
        } catch (err) {
            console.error("Lỗi khi tải đơn ứng tuyển", err);
            setAppsLoaded(true);
        }
    }, []);

    const fetchProfile = useCallback(async () => {
        try {
            const userId = sessionStorage.getItem('user_id');
            const response = await api.get('freelancers/');
            const allProfiles = response.data.results || response.data;
            const myProfile = allProfiles.find(p => String(p.user) === String(userId));
            setFreelancerProfile(myProfile);
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    }, []);

    const fetchJobDetail = useCallback(async () => {
        try {
            const response = await api.get(`jobs/${id}/`);
            setJob(response.data);
        } catch (error) {
            console.error('Error fetching job detail:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchJobDetail();
        fetchProfile();
        fetchApplications();
    }, [fetchJobDetail, fetchProfile, fetchApplications]);

    const handleLogout = (e) => {
        if (e) e.preventDefault();
        if (window.confirm(t('common.logoutConfirm') || "Bạn có chắc chắn muốn đăng xuất không?")) {
            sessionStorage.clear();
            localStorage.clear();
            navigate('/');
        }
    };

    const handleOpenProposal = () => {
        if (!freelancerProfile) {
            toast.error(t('findJobs.completeProfile') || "Vui lòng hoàn thiện hồ sơ Freelancer của bạn trước khi ứng tuyển!");
            return;
        }

        if (!freelancerProfile.user_info?.is_email_verified) {
            toast.error(t('findJobs.verifyEmail') || "Vui lòng xác minh email trước khi ứng tuyển.");
            return;
        }

        setBidAmount(job?.budget ? String(job.budget) : '');
        setCoverLetter('');
        setShowProposalModal(true);
    };

    const handleApplySubmit = async (e) => {
        if (e) e.preventDefault();
        setApplying(true);
        try {
            const parsedBid = bidAmount ? parseFloat(bidAmount) : (job?.budget ? parseFloat(job.budget) : null);
            const response = await api.post(`jobs/${id}/calculate_match/`, {
                freelancer_id: freelancerProfile.id,
                bid_amount: parsedBid,
                cover_letter: coverLetter.trim()
            });

            const newApp = {
                job: id,
                status: 'pending',
                matching_score: response.data.matching_score,
                bid_amount: parsedBid,
                cover_letter: coverLetter.trim()
            };
            setApplications(prev => [newApp, ...prev]);
            setShowProposalModal(false);

            toast.success(t('findJobs.successApply', { score: response.data.matching_score }) || `Ứng tuyển thành công! Độ khớp AI của bạn là: ${response.data.matching_score}%`);
        } catch (error) {
            console.error('Error applying:', error);
            toast.error(t('findJobs.failedApply') || "Ứng tuyển thất bại. Có thể bạn đã ứng tuyển công việc này rồi.");
        } finally {
            setApplying(false);
        }
    };

    const matchScore = job?.matching_score || 0;

    const getMatchDetails = (score) => {
        if (score >= 61) return {
            color: 'from-emerald-50 to-white',
            textColor: 'text-emerald-800',
            accentColor: 'text-emerald-600',
            borderColor: 'border-emerald-500',
            label: t('jobDetail.matchLevel.high') || 'Phù hợp cao',
            comment: t('jobDetail.matchComment.high') || 'Tuyệt vời! Kỹ năng và kinh nghiệm của bạn rất sát với yêu cầu dự án. Bạn là ứng viên tiềm năng hàng đầu!'
        };
        if (score >= 31) return {
            color: 'from-orange-50 to-white',
            textColor: 'text-orange-900',
            accentColor: 'text-orange-600',
            borderColor: 'border-orange-500',
            label: t('jobDetail.matchLevel.medium') || 'Khá phù hợp',
            comment: t('jobDetail.matchComment.medium') || `Khá phù hợp! Bạn có nền tảng tốt. Hãy đảm bảo CV của bạn thể hiện rõ các kỹ năng yêu cầu.`
        };
        return {
            color: 'from-rose-50 to-white',
            textColor: 'text-rose-900',
            accentColor: 'text-rose-600',
            borderColor: 'border-rose-500',
            label: t('jobDetail.matchLevel.low') || 'Phù hợp thấp',
            comment: t('jobDetail.matchComment.low') || `Mức độ phù hợp thấp. Hãy cân nhắc cập nhật thêm kỹ năng vào hồ sơ của bạn.`
        };
    };

    const analysis = getMatchDetails(matchScore);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat(t('common.locale') || 'vi-VN', { 
            style: 'currency', 
            currency: t('common.currency') || 'VND' 
        }).format(amount);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
    );

    if (!job) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">{t('jobDetail.notFound') || 'Không tìm thấy công việc này'}</h2>
            <Link to="/find-jobs" className="text-emerald-600 font-semibold hover:underline">{t('jobDetail.backToSearch') || 'Quay lại tìm việc'}</Link>
        </div>
    );

    return (
        <div className="bg-[#f8fafc] min-h-screen font-body text-slate-900 antialiased flex">
            <FreelancerSidebar profile={freelancerProfile} username={sessionStorage.getItem('username')} handleLogout={handleLogout} />
            
            <div className="flex-1 flex flex-col min-h-screen md:pl-64">
                <FreelancerTopNav profile={freelancerProfile} username={sessionStorage.getItem('username')} notifications={[]} />

                <div className="pt-24 px-8 max-w-350 mx-auto w-full">
                    <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-6">
                        <Link to="/find-jobs" className="hover:text-emerald-600 transition-colors">{t('findJobs.title') || 'Việc làm'}</Link>
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        <span className="text-slate-400">{job.project_type || t('jobDetail.projectDetail')}</span>
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        <span className="text-emerald-600 font-bold truncate max-w-50 md:max-w-none">{job.title}</span>
                    </nav>
                </div>

                <main className="pb-20 px-4 md:px-8 max-w-350 mx-auto flex flex-col lg:flex-row gap-8 w-full">
                    <div className="flex-1 space-y-6">
                        <article className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 relative overflow-hidden">
                            <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl font-bold flex items-center gap-2 transition-all shadow-md text-white ${matchScore >= 61 ? 'bg-emerald-500 shadow-emerald-500/20' :
                                    matchScore >= 31 ? 'bg-orange-500 shadow-orange-500/20' :
                                        'bg-rose-500 shadow-rose-500/20'
                                }`}>
                                <span className="material-symbols-outlined text-sm animate-pulse">auto_awesome</span>
                                {matchScore}% {t('findJobs.match') || 'Match'}
                            </div>

                            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-100">
                                            {job.project_type || t('findJobs.project')}
                                        </span>
                                        <span className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                                            <span className="material-symbols-outlined text-sm">schedule</span>
                                            {t('findJobs.posted') || 'Đăng'} {new Date(job.created_at).toLocaleDateString(t('common.locale') || 'vi-VN')}
                                        </span>
                                    </div>
                                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">
                                        {job.title}
                                    </h1>
                                    <div className="flex flex-wrap items-center gap-6 text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-emerald-600">payments</span>
                                            <span className="font-bold text-slate-900 text-lg">{formatCurrency(job.budget)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-slate-400">location_on</span>
                                            <span className="text-sm font-medium">{job.location || t('common.remote')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-slate-400">hourglass_empty</span>
                                            <span className="text-sm font-medium">{job.duration || t('findJobs.contact')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-rose-500">event</span>
                                            <span className="text-sm font-bold text-rose-600">
                                                Hạn chót: {job.deadline ? new Date(job.deadline).toLocaleDateString(t('common.locale') || 'vi-VN') : 'Không thời hạn'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full md:w-auto flex flex-col gap-3">
                                    {(() => {
                                        if (!appsLoaded) {
                                            return <div className="w-full h-15 bg-slate-100 rounded-xl animate-pulse"></div>;
                                        }

                                        const application = applications.find(app => String(app.job) === String(id) && String(app.status).toLowerCase() !== 'rejected');
                                        const isApplied = !!application;
                                        const isAccepted = String(application?.status || '').toLowerCase() === 'accepted';

                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        const isDeadlinePassed = job.deadline ? new Date(job.deadline) < today : false;

                                        if (isAccepted) {
                                            return (
                                                <button
                                                    disabled
                                                    className="px-8 py-4 bg-slate-400 text-white rounded-full font-bold text-lg shadow-lg opacity-80 cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined">verified</span>
                                                    {t('jobDetail.status.accepted') || 'Đã được nhận'}
                                                </button>
                                            );
                                        }

                                        if (isApplied) {
                                            return (
                                                <button
                                                    disabled
                                                    className="px-8 py-4 bg-[#f9a825] text-white rounded-full font-bold text-lg shadow-lg opacity-80 cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined">schedule</span>
                                                    {t('findJobs.applying') || 'Đã ứng tuyển'}
                                                </button>
                                            );
                                        }

                                        if (isDeadlinePassed) {
                                            return (
                                                <button
                                                    disabled
                                                    className="px-8 py-4 bg-slate-300 text-slate-600 rounded-full font-bold text-lg shadow opacity-80 cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined">event_busy</span>
                                                    Đã hết hạn ứng tuyển
                                                </button>
                                            );
                                        }

                                        return (
                                            <button
                                                onClick={handleOpenProposal}
                                                disabled={applying}
                                                className="px-8 py-4 bg-emerald-600 text-white rounded-full font-bold text-lg shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                            >
                                                <span className="material-symbols-outlined">bolt</span>
                                                {applying ? (t('findJobs.sending') || 'Đang gửi...') : (t('findJobs.quickApply') || 'Ứng tuyển ngay')}
                                            </button>
                                        );
                                    })()}
                                    <button className="px-8 py-3 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-lg">favorite</span>
                                        {t('findJobs.saveJob') || 'Lưu tin này'}
                                    </button>
                                </div>
                            </div>

                            <div className={`mt-10 p-5 bg-linear-to-br ${analysis.color} rounded-2xl ${analysis.textColor} relative overflow-hidden transition-all duration-500 border ${analysis.borderColor}/20`}>
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <span className="material-symbols-outlined text-8xl">auto_awesome</span>
                                </div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                                    <div className="text-center md:text-left">
                                        <h3 className={`text-xl font-black mb-1 flex items-center justify-center md:justify-start gap-2 ${analysis.accentColor}`}>
                                            <span className="material-symbols-outlined">verified</span>
                                            AI Matcher Analysis
                                        </h3>
                                        <p className={`text-base font-bold opacity-100 leading-relaxed max-w-xl ${analysis.textColor}`}>
                                            {analysis.comment}
                                        </p>
                                    </div>
                                    <div className="ml-auto flex items-center gap-4">
                                        <div className={`w-20 h-20 rounded-full border-4 ${analysis.borderColor}/30 flex items-center justify-center relative shadow-inner`}>
                                            <span className={`text-2xl font-black italic ${analysis.textColor}`}>{matchScore}%</span>
                                            <div className={`absolute -inset-1 border-4 ${analysis.borderColor} rounded-full border-t-transparent animate-spin-slow`}></div>
                                        </div>
                                        <div className={`text-sm font-black uppercase tracking-widest ${analysis.accentColor} drop-shadow-sm`}>{analysis.label}</div>
                                    </div>
                                </div>
                            </div>
                        </article>

                        <article className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-12">
                            <section>
                                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <span className="w-2 h-8 bg-emerald-600 rounded-full"></span>
                                    {t('jobDetail.description') || 'Mô tả công việc'}
                                </h2>
                                <div 
                                    className="prose prose-slate max-w-none text-slate-600 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: job.description }}
                                ></div>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <span className="w-2 h-8 bg-emerald-600 rounded-full"></span>
                                    {t('jobDetail.skillsRequirements') || 'Kỹ năng & Yêu cầu'}
                                </h2>
                                <div className="flex flex-wrap gap-3 mb-8">
                                    {job.requirements && job.requirements.map((req, idx) => (
                                        <div key={idx} className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                            <span className="text-sm font-bold text-slate-700">{(typeof req.skill === 'object' ? req.skill.name : req.skill)}</span>
                                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-black">X {req.weight}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-4">
                                    <div className="flex gap-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                        <span className="material-symbols-outlined text-amber-600">tips_and_updates</span>
                                        <p className="text-sm text-amber-900 leading-relaxed">
                                            <span className="font-bold">{t('jobDetail.aiSystem') || 'Hệ thống gợi ý'}:</span> {t('jobDetail.aiSystemNote') || 'Công việc này ưu tiên những ứng viên có kỹ năng phù hợp với yêu cầu thực tế. Hãy đảm bảo hồ sơ của bạn cập nhật đầy đủ.'}
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <span className="w-2 h-8 bg-emerald-600 rounded-full"></span>
                                    {t('jobDetail.benefits') || 'Quyền lợi dành cho bạn'}
                                </h2>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(() => {
                                        const benefits = t('jobDetail.benefitsList', { returnObjects: true });
                                        const items = Array.isArray(benefits) ? benefits : [
                                            'Mức lương cạnh tranh và thưởng theo dự án',
                                            'Làm việc cùng đội ngũ chuyên gia giàu kinh nghiệm',
                                            'Cơ hội tiếp cận các dự án AI quy mô lớn',
                                            'Thời gian làm việc linh hoạt, ưu tiên Remote'
                                        ];
                                        return items.map((item, idx) => (
                                            <li key={idx} className="flex gap-3">
                                                <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                                                <span className="text-sm text-slate-600 font-medium">{item}</span>
                                            </li>
                                        ));
                                    })()}
                                </ul>
                            </section>
                        </article>
                    </div>

                    <aside className="w-full lg:w-96 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
                            <div className="h-24 bg-linear-to-r from-emerald-100 to-teal-100 p-6 flex justify-end">
                                <span className="material-symbols-outlined text-emerald-400 text-4xl opacity-30">business</span>
                            </div>
                            <div className="px-8 pb-8 -mt-10">
                                <div className="w-20 h-20 bg-white rounded-2xl shadow-md border border-slate-100 p-3 mb-4 relative overflow-hidden group">
                                    <img
                                        src={job.company?.logo || "https://lh3.googleusercontent.com/a/default-user"}
                                        alt="Company Logo"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2 truncate group-hover:text-emerald-600 transition-colors">
                                    {job.company?.company_name || t('findJobs.employer')}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mb-6 line-clamp-3 leading-relaxed">
                                    {job.company?.description || t('jobDetail.noCompanyDesc')}
                                </p>

                                <div className="space-y-4 pt-6 border-t border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('jobDetail.companySize') || 'Quy mô'}</span>
                                        <span className="text-sm font-bold text-slate-700">{job.company?.size || '11-50'} {t('jobDetail.employees') || 'nhân viên'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Website</span>
                                        <a href={job.company?.website} target="_blank" rel="noreferrer" className="text-sm font-bold text-emerald-600 hover:underline">{t('jobDetail.visit') || 'Truy cập'}</a>
                                    </div>
                                </div>

                                <button onClick={() => navigate(`/public-profile/${job.company?.id}`)} className="w-full mt-8 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
                                    {t('jobDetail.viewCompanyProfile') || 'Xem hồ sơ công ty'}
                                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                                </button>
                                <button onClick={() => navigate(`/chat?user_id=${job.company?.user}`)} className="w-full mt-3 py-3 border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                                    {t('jobDetail.directMessage') || 'Nhắn tin trực tiếp'}
                                    <span className="material-symbols-outlined text-sm">chat</span>
                                </button>
                            </div>
                        </div>
                    </aside>
                </main>
            </div>
            {/* Modal Nộp Đề Xuất Ứng Tuyển */}
            {showProposalModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setShowProposalModal(false)}
                            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>

                        <div className="flex items-center space-x-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <span className="material-symbols-outlined text-2xl">description</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Gửi đề xuất ứng tuyển</h3>
                                <p className="text-xs text-slate-500 font-medium line-clamp-1">{job?.title}</p>
                            </div>
                        </div>

                        <form onSubmit={handleApplySubmit} className="space-y-5">
                            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-medium">Ngân sách dự án:</span>
                                <span className="font-bold text-slate-800">
                                    {job?.budget ? formatCurrency(job.budget) : 'Thỏa thuận'}
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                    Mức giá bạn đề xuất (VND)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        step="1000"
                                        value={bidAmount}
                                        onChange={(e) => setBidAmount(e.target.value)}
                                        placeholder="Nhập mức giá bạn mong muốn..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                        VND
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1.5">
                                    Để trống nếu bạn đồng ý với ngân sách gốc của dự án.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                    Thư chào hàng / Đề xuất giải pháp (Cover Letter)
                                </label>
                                <textarea
                                    rows="5"
                                    value={coverLetter}
                                    onChange={(e) => setCoverLetter(e.target.value)}
                                    placeholder="Giới thiệu kinh nghiệm liên quan, giải pháp bạn sẽ thực hiện, công nghệ sử dụng và thời gian dự kiến hoàn thành..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none leading-relaxed"
                                />
                            </div>

                            <div className="flex space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowProposalModal(false)}
                                    className="w-1/3 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={applying}
                                    className="w-2/3 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                                >
                                    {applying ? (
                                        <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-base">send</span>
                                            <span>Gửi hồ sơ ứng tuyển</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .animate-spin-slow { animation: spin 3s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default JobDetail;

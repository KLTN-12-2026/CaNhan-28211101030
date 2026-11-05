import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import FreelancerSidebar from '../components/FreelancerSidebar';
import FreelancerTopNav from '../components/FreelancerTopNav';
import { useTranslation } from 'react-i18next';

import { toast } from 'react-hot-toast';
function Applications() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    const username = sessionStorage.getItem('username') || localStorage.getItem('username') || 'Freelancer';
    const userId = sessionStorage.getItem('user_id') || localStorage.getItem('user_id');

    // HÀM LẤY MÀU CHO AI MATCH (Đồng bộ với Find Jobs)
    const getMatchColor = (score) => {
        if (score >= 61) return 'bg-emerald-500 text-white shadow-emerald-500/20';
        if (score >= 31) return 'bg-orange-500 text-white shadow-orange-500/20';
        return 'bg-rose-500 text-white shadow-rose-500/20';
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Lấy profile của Freelancer hiện tại
                const profileRes = await api.get('freelancers/');
                const allProfiles = profileRes.data.results || profileRes.data;
                const myProfile = allProfiles.find(p => String(p.user) === String(userId));
                
                if (myProfile) {
                    setProfile(myProfile);
                    
                    // 2. Lấy tất cả applications và jobs
                    const [appsRes, jobsRes] = await Promise.all([
                        api.get('applications/'),
                        api.get('jobs/')
                    ]);
                    
                    const allApps = appsRes.data.results || appsRes.data;
                    const allJobs = jobsRes.data.results || jobsRes.data;
                    
                    // 3. Lọc ra các applications thuộc về freelancer này
                    const myApps = allApps.filter(app => 
                        String(app.freelancer) === String(myProfile.id) || 
                        (app.freelancer_info && String(app.freelancer_info.id) === String(myProfile.id))
                    );
                    
                    setApplications(myApps);
                    setJobs(allJobs);
                }
            } catch (error) {
                console.error("Lỗi khi tải dữ liệu Applications:", error);
            } finally {
                setLoading(false);
            }
        };

        if (userId) fetchData();
        else setLoading(false);
    }, [userId]);

    const handleLogout = (e) => {
        if (e) e.preventDefault();
        if (window.confirm(t('common.logoutConfirm') || "Bạn có chắc chắn muốn đăng xuất không?")) {
            sessionStorage.clear();
            localStorage.clear();
            navigate('/');
        }
    };

    const getJobDetails = (jobId) => {
        return jobs.find(j => String(j.id) === String(jobId)) || null;
    };

    const getStatusConfig = (status) => {
        const s = String(status).toLowerCase();
        switch(s) {
            case 'accepted':
                return { color: 'text-slate-700 bg-slate-100 border-slate-200', icon: 'check_circle', label: t('applications.status.accepted', 'Đã chấp nhận') };
            case 'rejected':
                return { color: 'text-rose-700 bg-rose-50 border-rose-200', icon: 'cancel', label: t('applications.status.rejected', 'Đã từ chối') };
            case 'interviewing':
                return { color: 'text-blue-700 bg-blue-50 border-blue-200', icon: 'forum', label: t('applications.status.interviewing', 'Đang trao đổi') };
            case 'hired':
                return { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: 'verified', label: t('applications.status.hired', 'Đã nhận') };
            case 'completed':
                return { color: 'text-indigo-700 bg-indigo-50 border-indigo-200', icon: 'task_alt', label: t('applications.status.completed', 'Đã hoàn thành') };
            default:
                return { color: 'text-amber-700 bg-amber-50 border-amber-200', icon: 'schedule', label: t('applications.status.pending', 'Đang chờ duyệt') };
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + 
               date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const statusCounts = {
        all: applications.length,
        pending: applications.filter(app => app.status.toLowerCase() === 'pending').length,
        interviewing: applications.filter(app => app.status.toLowerCase() === 'interviewing').length,
        success: applications.filter(app => ['accepted', 'hired', 'completed'].includes(app.status.toLowerCase())).length,
        rejected: applications.filter(app => app.status.toLowerCase() === 'rejected').length
    };

    const filteredApplications = applications.filter(app => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'pending') return app.status.toLowerCase() === 'pending';
        if (filterStatus === 'interviewing') return app.status.toLowerCase() === 'interviewing';
        if (filterStatus === 'success') return ['accepted', 'hired', 'completed'].includes(app.status.toLowerCase());
        if (filterStatus === 'rejected') return app.status.toLowerCase() === 'rejected';
        return true;
    });

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-teal-600 font-bold">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mr-4"></div>
            {t('applications.loading') || 'Đang tải dữ liệu ứng tuyển...'}
        </div>
    );

    return (
        <div className="bg-[#f8fafc] text-slate-900 overflow-x-hidden min-h-screen font-['Inter']">
            {/* SideNavBar */}
            <FreelancerSidebar profile={profile} username={username} handleLogout={handleLogout} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen md:pl-64">
                {/* Top Nav */}
                <FreelancerTopNav profile={profile} username={username} notifications={[]} />

                <main className="pt-24 px-4 md:px-10 pb-12 min-h-screen">
                    <div className="max-w-350 mx-auto">
                        {/* Header */}
                        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8">
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                                    <span className="material-symbols-outlined text-teal-600 text-5xl bg-teal-50 p-3 rounded-2xl">description</span>
                                    {t('applications.title') || 'My Applications'}
                                </h1>
                                <p className="text-slate-500 mt-3 font-medium text-lg">{t('applications.subtitle') || 'Theo dõi trạng thái và quản lý hành trình ứng tuyển của bạn.'}</p>
                            </div>
                            <div className="mt-6 md:mt-0">
                                <div className="bg-white px-8 py-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Tổng đơn nộp</p>
                                        <p className="text-3xl font-black text-teal-700">{applications.length}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                                        <span className="material-symbols-outlined text-teal-600">analytics</span>
                                    </div>
                                </div>
                            </div>
                        </header>

                        {/* FILTER PILL TABS */}
                        {applications.length > 0 && (
                            <div className="mb-8 flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => setFilterStatus('all')}
                                    className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm ${
                                        filterStatus === 'all' 
                                        ? 'bg-teal-600 text-white shadow-teal-500/30' 
                                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                    }`}
                                >
                                    Tất cả <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] ${filterStatus === 'all' ? 'bg-teal-500/30 text-white' : 'bg-slate-100 text-slate-500'}`}>{statusCounts.all}</span>
                                </button>
                                <button
                                    onClick={() => setFilterStatus('pending')}
                                    className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm ${
                                        filterStatus === 'pending' 
                                        ? 'bg-amber-500 text-white shadow-amber-500/30' 
                                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                    }`}
                                >
                                    Đang chờ <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] ${filterStatus === 'pending' ? 'bg-amber-400/30 text-white' : 'bg-slate-100 text-slate-500'}`}>{statusCounts.pending}</span>
                                </button>
                                <button
                                    onClick={() => setFilterStatus('interviewing')}
                                    className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm ${
                                        filterStatus === 'interviewing' 
                                        ? 'bg-blue-600 text-white shadow-blue-500/30' 
                                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                    }`}
                                >
                                    Đang trao đổi <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] ${filterStatus === 'interviewing' ? 'bg-blue-400/30 text-white' : 'bg-slate-100 text-slate-500'}`}>{statusCounts.interviewing}</span>
                                </button>
                                <button
                                    onClick={() => setFilterStatus('success')}
                                    className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm ${
                                        filterStatus === 'success' 
                                        ? 'bg-emerald-500 text-white shadow-emerald-500/30' 
                                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                    }`}
                                >
                                    Thành công <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] ${filterStatus === 'success' ? 'bg-emerald-400/30 text-white' : 'bg-slate-100 text-slate-500'}`}>{statusCounts.success}</span>
                                </button>
                                <button
                                    onClick={() => setFilterStatus('rejected')}
                                    className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm ${
                                        filterStatus === 'rejected' 
                                        ? 'bg-rose-500 text-white shadow-rose-500/30' 
                                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                    }`}
                                >
                                    Bị từ chối <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] ${filterStatus === 'rejected' ? 'bg-rose-400/30 text-white' : 'bg-slate-100 text-slate-500'}`}>{statusCounts.rejected}</span>
                                </button>
                            </div>
                        )}

                        {applications.length === 0 ? (
                            <div className="bg-white p-20 rounded-3xl text-center border-2 border-dashed border-slate-200 shadow-sm">
                                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span className="material-symbols-outlined text-5xl text-slate-300">work_history</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-800">{t('applications.noAppsTitle') || 'Bạn chưa ứng tuyển công việc nào'}</h3>
                                <p className="text-slate-500 max-w-md mx-auto mt-3 text-lg">{t('applications.noAppsDesc') || 'Hãy khám phá các dự án mới nhất và để AI giúp bạn tìm thấy công việc phù hợp nhất.'}</p>
                                <button 
                                    onClick={() => navigate('/find-jobs')}
                                    className="mt-8 bg-teal-600 text-white px-10 py-4 rounded-full font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 active:scale-95"
                                >
                                    {t('applications.findJobsBtn') || 'Khám phá việc làm ngay'}
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
                                <div className="min-w-250">
                                    <table className="w-full text-left border-collapse table-auto">
                                        <thead>
                                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                                <th className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('applications.table.jobCompany')}</th>
                                                <th className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('applications.table.date')}</th>
                                                <th className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">{t('applications.table.match')}</th>
                                                <th className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('applications.table.status')}</th>
                                                <th className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">{t('applications.table.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredApplications.sort((a, b) => new Date(b.created_at) - new Date(a.applied_at)).map(app => {
                                                const job = getJobDetails(app.job);
                                                const statusCfg = getStatusConfig(app.status);
                                                const matchScore = Math.round(app.matching_score || 0);
                                                const dateStr = formatDate(app.created_at || app.applied_at);
                                                
                                                return (
                                                    <tr key={app.id} className="hover:bg-slate-50/50 transition-all group">
                                                        <td className="px-3 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0 p-1 group-hover:border-teal-200 transition-colors">
                                                                    <img 
                                                                        src={job?.company?.logo || job?.company_info?.logo || "https://lh3.googleusercontent.com/a/default-user"} 
                                                                        alt="Company" 
                                                                        className="w-full h-full object-contain"
                                                                    />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h4 className="font-bold text-slate-900 text-xs truncate group-hover:text-teal-700 transition-colors">
                                                                        {job?.title || t('applications.loadingJob')}
                                                                    </h4>
                                                                    <p className="text-[10px] font-medium text-slate-400 truncate">
                                                                        {job?.company?.company_name || job?.company_name || t('common.hiddenCompany')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold text-slate-700">{dateStr.split(' ')[1]}</span>
                                                                <span className="text-[8px] font-medium text-slate-400 uppercase tracking-tighter">{dateStr.split(' ')[0]}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 whitespace-nowrap text-center">
                                                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black shadow-sm ${getMatchColor(matchScore)}`}>
                                                                {matchScore}%
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 whitespace-nowrap">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black border uppercase tracking-wider ${statusCfg.color}`}>
                                                                {statusCfg.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-3 whitespace-nowrap text-right">
                                                            <div className="flex justify-end gap-1">
                                                                {(app.status.toLowerCase() === 'interviewing' || app.status.toLowerCase() === 'hired' || app.status.toLowerCase() === 'accepted') && (
                                                                    <button 
                                                                        onClick={() => navigate(`/chat?user_id=${job?.company?.user}`)}
                                                                        className="h-7 px-3 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-all flex items-center justify-center gap-1 font-bold text-[10px] uppercase tracking-wider"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[14px]">chat</span>
                                                                        {t('applications.messageBtn', 'Nhắn tin')}
                                                                    </button>
                                                                )}

                                                                <Link 
                                                                    to={`/jobs/${app.job}`}
                                                                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-teal-600 hover:border-teal-200 transition-all flex items-center justify-center"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                                                                </Link>
                                                                
                                                                {app.status.toLowerCase() === 'pending' && (
                                                                    <button 
                                                                        onClick={async () => {
                                                                            if (window.confirm(t('applications.confirmDelete') || "Bạn có chắc chắn muốn rút hồ sơ ứng tuyển này không?")) {
                                                                                try {
                                                                                    await api.delete(`applications/${app.id}/`);
                                                                                    setApplications(prev => prev.filter(a => a.id !== app.id));
                                                                                } catch {
                                                                                    toast.error(t('applications.deleteError') || "Không thể hủy ứng tuyển.");
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-300 hover:text-rose-600 hover:border-rose-200 transition-all flex items-center justify-center"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Applications;

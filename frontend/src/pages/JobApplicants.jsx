import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import ClientSidebar from '../components/ClientSidebar';

import { toast } from 'react-hot-toast';
const JobApplicants = () => {
    const { id: jobId } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [company, setCompany] = useState(null);

    const fetchJobAndApplicants = useCallback(async () => {
        try {
            const userId = sessionStorage.getItem('user_id');
            const [jobRes, appsRes, companyRes] = await Promise.all([
                api.get(`jobs/${jobId}/`),
                api.get(`applications/`),
                api.get('companies/')
            ]);

            setJob(jobRes.data);

            // Filter applications for THIS job
            const allApps = appsRes.data.results || appsRes.data;
            const jobApps = allApps.filter(app => String(app.job) === String(jobId));
            setApplications(jobApps);

            // Fetch company for sidebar
            const allCompanies = companyRes.data.results || companyRes.data;
            const currentCompany = allCompanies.find(c => String(c.user) === String(userId));
            setCompany(currentCompany);

        } catch (error) {
            console.error("Lỗi khi tải ứng viên:", error);
        } finally {
            setLoading(false);
        }
    }, [jobId]);

    useEffect(() => {
        fetchJobAndApplicants();
    }, [jobId, fetchJobAndApplicants]);

    const handleLogout = () => {
        if (window.confirm("Bạn có chắc muốn đăng xuất?")) {
            sessionStorage.clear();
            navigate('/');
        }
    };

    const handleStatusUpdate = async (appId, newStatus) => {
        let confirmMsg = "Bạn có chắc chắn muốn thực hiện hành động này?";
        if (newStatus === 'Interviewing') confirmMsg = "Bạn có chắc chắn muốn tiến hành TRAO ĐỔI với ứng viên này?";
        else if (newStatus === 'Accepted') confirmMsg = "Bạn có chắc chắn muốn CHẤP NHẬN ứng viên này?";
        else if (newStatus === 'Rejected') confirmMsg = "Bạn có chắc chắn muốn TỪ CHỐI ứng viên này?";
        else if (newStatus === 'Pending') confirmMsg = "Bạn có chắc chắn muốn HOÀN TÁC quyết định này?";

        if (!window.confirm(confirmMsg)) return;

        try {
            await api.post(`applications/${appId}/update_status/`, {
                status: newStatus
            });
            
            // Xóa bộ nhớ cache để refetch khi quay lại
            sessionStorage.removeItem(`job_applicants_${jobId}`);
            
            const actionText = newStatus === 'Interviewing' ? 'bắt đầu trao đổi' : newStatus === 'Accepted' ? 'chấp nhận' : newStatus === 'Rejected' ? 'từ chối' : 'hoàn tác';
            toast.success(`Đã ${actionText} thành công!`);
            fetchJobAndApplicants();
        } catch (error) {
            console.error("Lỗi khi cập nhật trạng thái:", error);
            toast.error("Cập nhật trạng thái thất bại. Vui lòng thử lại.");
        }
    };

    const getAvatarUrl = (path) => {
        if (!path) return "https://lh3.googleusercontent.com/a/default-user";
        if (path.startsWith('http')) return path;
        return `http://127.0.0.1:8000${path}`;
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-teal-600 font-bold">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mr-4"></div>
            Đang tải danh sách ứng viên...
        </div>
    );

    return (
        <div className="bg-[#f8fafc] min-h-screen font-body text-slate-900 antialiased">
            {/* TopNavBar */}
            <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-8 h-16 bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200">
                <span className="text-xl font-black tracking-tight text-teal-700">FreelanceAI</span>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/notifications')}
                        className="p-2 text-slate-600 hover:bg-teal-50/50 rounded-full transition-all"
                    >
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                    <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-teal-50 bg-slate-100">
                        <img alt="Company" className="w-full h-full object-cover" src={company?.logo || "https://lh3.googleusercontent.com/default-user"} />
                    </div>
                </div>
            </nav>

            <ClientSidebar companyName={company?.company_name} handleLogout={handleLogout} />

            <main className="md:ml-64 pt-24 pb-20 px-4 md:px-10 max-w-350 mx-auto">
                <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-8">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-black text-teal-600 uppercase tracking-widest mb-2">
                            <Link to="/my-jobs" className="hover:underline">Quản lý tin đăng</Link>
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                            Ứng viên
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 leading-tight">Ứng viên cho: {job?.title}</h1>
                        <p className="text-slate-500 mt-2 font-medium">Tìm thấy {applications.length} ứng viên đã ứng tuyển vào vị trí này.</p>
                    </div>
                </div>

                {applications.length === 0 ? (
                    <div className="bg-white p-20 rounded-3xl text-center border-2 border-dashed border-slate-200">
                        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">person_search</span>
                        <h3 className="text-xl font-bold text-slate-800">Chưa có ứng viên nào</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-2">Dự án của bạn đang được giới thiệu tới các Freelancer. Hãy kiên nhẫn chờ đợi kết quả từ AI Matcher!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {applications.map(app => (
                            <div key={app.id} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                                {/* Match Score Badge */}
                                <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl font-black text-sm shadow-md text-white transition-all ${app.matching_score >= 61 ? 'bg-emerald-500 shadow-emerald-500/20' :
                                        app.matching_score >= 31 ? 'bg-orange-500 shadow-orange-500/20' :
                                            'bg-rose-500 shadow-rose-500/20'
                                    }`}>
                                    {Math.round(app.matching_score)}% MATCH
                                </div>

                                <div className="flex flex-col items-center text-center space-y-4">
                                    <img
                                        src={getAvatarUrl(app.freelancer_info?.avatar)}
                                        alt={app.freelancer_info?.full_name}
                                        className="w-24 h-24 rounded-full object-cover ring-4 ring-teal-50 group-hover:ring-teal-100 transition-all"
                                    />
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 group-hover:text-teal-700 transition-colors">{app.freelancer_info?.full_name}</h3>
                                        <p className="text-sm font-bold text-teal-600 uppercase tracking-wide mt-1">{app.freelancer_info?.professional_title || 'Expert'}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                                        {app.freelancer_info?.location || 'Remote'}
                                    </div>
                                    <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed min-h-10">
                                        {app.freelancer_info?.bio || 'Hồ sơ chưa có mô tả chi tiết.'}
                                    </p>
                                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                                        {Array.isArray(app.freelancer_info?.skill_list) && app.freelancer_info.skill_list.slice(0, 3).map(skill => (
                                            <span key={skill} className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-[10px] font-bold border border-slate-100">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="w-full pt-6 space-y-3">
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => navigate(`/freelancer-profile/${app.freelancer_info?.id}`)}
                                                className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg"
                                            >
                                                <span className="material-symbols-outlined text-sm">visibility</span> Hồ sơ
                                            </button>
                                            <button
                                                onClick={() => navigate(`/chat?user_id=${app.freelancer_info?.user}`)}
                                                className="flex items-center justify-center w-12 h-12 bg-teal-50 text-teal-700 rounded-xl hover:bg-teal-100 transition-colors"
                                                title="Gửi tin nhắn"
                                            >
                                                <span className="material-symbols-outlined">chat</span>
                                            </button>
                                        </div>

                                        {/* Status Actions */}
                                        <div className="flex gap-2">
                                            {app.status === 'Pending' ? (
                                                <>
                                                    <button
                                                        onClick={() => handleStatusUpdate(app.id, 'Interviewing')}
                                                        className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-blue-600 transition-colors shadow-sm"
                                                    >
                                                        Trao đổi
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(app.id, 'Accepted')}
                                                        className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-emerald-600 transition-colors shadow-sm"
                                                    >
                                                        Chấp nhận
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(app.id, 'Rejected')}
                                                        className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-rose-600 transition-colors shadow-sm"
                                                    >
                                                        Từ chối
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="flex w-full gap-2 flex-wrap">
                                                    <div className={`flex-1 min-w-[100px] py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-center border flex items-center justify-center ${
                                                        (app.status === 'Interviewing') ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        (app.status === 'Accepted' || app.status === 'Hired') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        'bg-rose-50 text-rose-600 border-rose-100'
                                                    }`}>
                                                        {app.status === 'Interviewing' ? 'Đang trao đổi' : (app.status === 'Accepted' || app.status === 'Hired') ? 'Đã nhận' : 'Đã từ chối'}
                                                    </div>
                                                    
                                                    {(app.status === 'Interviewing' || app.status === 'Accepted' || app.status === 'Hired') && (
                                                        <button
                                                            onClick={() => navigate(`/chat?user_id=${app.freelancer_info?.user}`)}
                                                            className="flex-1 min-w-[100px] py-2.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-1"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">chat</span>
                                                            Nhắn tin
                                                        </button>
                                                    )}

                                                    {app.status === 'Interviewing' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleStatusUpdate(app.id, 'Accepted')}
                                                                className="px-3 py-2.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center"
                                                                title="Chấp nhận"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">check</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusUpdate(app.id, 'Rejected')}
                                                                className="px-3 py-2.5 bg-rose-500 text-white hover:bg-rose-600 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center"
                                                                title="Từ chối"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">close</span>
                                                            </button>
                                                        </>
                                                    )}

                                                    <button
                                                        onClick={() => handleStatusUpdate(app.id, 'Pending')}
                                                        className="px-3 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center"
                                                        title="Hoàn tác"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">undo</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default JobApplicants;

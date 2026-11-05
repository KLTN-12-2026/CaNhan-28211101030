import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import ClientSidebar from '../components/ClientSidebar';
import { useTranslation } from 'react-i18next';

import { toast } from 'react-hot-toast';
const fetchMyJobsData = async (userId) => {
    const [companyRes, jobsRes, skillsRes] = await Promise.all([
        api.get('companies/'),
        api.get('jobs/'),
        api.get('skills/')
    ]);

    const allCompanies = companyRes.data.results || companyRes.data;
    const currentCompany = allCompanies.find(c => String(c.user) === String(userId));
    const allJobs = jobsRes.data.results || jobsRes.data;
    const clientJobs = currentCompany
        ? allJobs.filter(job => {
            const jobClientId = typeof job.client === 'object' ? job.client?.id : job.client;
            return String(jobClientId) === String(currentCompany.id);
        })
        : [];

    return {
        skills: skillsRes.data.results || skillsRes.data,
        company: currentCompany || null,
        jobs: clientJobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    };
};

function MyJobs() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const userId = sessionStorage.getItem('user_id');

    const [company, setCompany] = useState(null);
    const [myJobs, setMyJobs] = useState([]);
    const [availableSkills, setAvailableSkills] = useState([]); // THÊM STATE LƯU DANH SÁCH SKILL
    const [loading, setLoading] = useState(() => !!userId);

    // STATE CHO CHẾ ĐỘ CHỈNH SỬA
    const [editingJobId, setEditingJobId] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    // ĐĂNG XUẤT
    const handleLogout = (e) => {
        if (e) e.preventDefault();
        if (window.confirm(t('common.logoutConfirm'))) {
            sessionStorage.clear();
            navigate('/');
        }
    };

    useEffect(() => {
        if (!userId) return;

        let isActive = true;

        fetchMyJobsData(userId)
            .then(({ skills, company: currentCompany, jobs }) => {
                if (!isActive) return;

                setAvailableSkills(skills);
                setCompany(currentCompany);
                setMyJobs(jobs);
            })
            .catch((error) => {
                console.error("Lỗi khi tải dữ liệu:", error);
            })
            .finally(() => {
                if (isActive) {
                    setLoading(false);
                }
            });

        return () => {
            isActive = false;
        };
    }, [userId]);

    // --- CÁC HÀM XỬ LÝ CHỈNH SỬA ---
    const startEditing = (job) => {
        setEditingJobId(job.id);
        setEditFormData({
            title: job.title,
            description: job.description,
            budget: job.budget,
            is_active: job.is_active,
            requirements: job.requirements ? job.requirements.map(req => ({
                skill: req.skill?.name || req.skill || '',
                weight: req.weight || 1.0
            })) : []
        });
    };

    const cancelEditing = () => {
        setEditingJobId(null);
        setEditFormData({});
    };

    const handleEditChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleRequirementChange = (index, field, value) => {
        const updatedReqs = [...editFormData.requirements];
        updatedReqs[index][field] = value;
        setEditFormData(prev => ({ ...prev, requirements: updatedReqs }));
    };

    const removeRequirement = (index) => {
        const updatedReqs = editFormData.requirements.filter((_, i) => i !== index);
        setEditFormData(prev => ({ ...prev, requirements: updatedReqs }));
    };

    const addRequirement = () => {
        setEditFormData(prev => ({
            ...prev,
            requirements: [...prev.requirements, { skill: '', weight: 1.0 }]
        }));
    };

    const saveEdit = async (jobId) => {
        try {
            // Lọc bỏ những requirement chưa chọn kỹ năng (skill rỗng) để tránh lỗi Backend
            const cleanedData = {
                ...editFormData,
                requirements: editFormData.requirements.filter(req => req.skill.trim() !== '')
            };

            const response = await api.patch(`jobs/${jobId}/`, cleanedData);
            setMyJobs(prev => prev.map(job => job.id === jobId ? response.data : job));
            setEditingJobId(null);
            toast.success("Đã lưu thay đổi thành công! 🎉");
        } catch (error) {
            console.error("Lỗi khi lưu:", error.response?.data || error);
            toast.error("Không thể lưu. Vui lòng kiểm tra lại Console.");
        }
    };

    // XÓA TIN TUYỂN DỤNG
    const handleDeleteJob = async (jobId) => {
        // Hiện hộp thoại xác nhận trước khi xóa để tránh lỡ tay bấm nhầm
        const isConfirm = window.confirm("Bạn có chắc chắn muốn xóa tin tuyển dụng này không? Hành động này không thể hoàn tác.");

        if (isConfirm) {
            try {
                // Gọi API để xóa job trên Django
                await api.delete(`jobs/${jobId}/`);

                // Lọc bỏ job vừa xóa khỏi danh sách đang hiển thị trên React
                setMyJobs(prev => prev.filter(job => job.id !== jobId));

                toast.success("Đã xóa tin tuyển dụng thành công! 🗑️");
            } catch (error) {
                console.error("Lỗi khi xóa tin:", error.response?.data || error);
                toast.error("Không thể xóa tin này. Vui lòng thử lại sau.");
            }
        }
    };

    if (loading) return <div className="flex justify-center items-center min-h-screen text-primary font-bold">{t('common.loading')}</div>;

    return (
        <div className="bg-surface font-body text-on-surface min-h-screen">
            {/* TopNavBar */}
            <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-8 h-16 bg-white/80 backdrop-blur-xl shadow-sm border-b border-outline-variant/20">
                <div className="flex items-center gap-8">
                    <span className="text-xl font-black tracking-tight text-teal-700">FreelanceAI</span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/notifications')} className="p-2 text-slate-600 hover:bg-teal-50/50 rounded-full transition-all">
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                    <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-primary-container/20 bg-slate-100">
                        <img alt="Company Profile" className="w-full h-full object-cover" src={company?.logo || "https://lh3.googleusercontent.com/aida-public/AB6AXuDO4Wlc04yb3coKIQc89GymGX6-k8onAe0bPNWzoZi3-xZPhqAJJpPJo1ABSIgH2TNKtH2VlwEL8pziNIK3I-9AU0ycJIN6rTwhw7H366dFKBuoABlLJVvRmoqDIRqINqypikAiyGFRE1PfJ3MOuAowutjUQZJO4uF0wqKV4bgqLxYzYsOUzsMn7WTjd38419RwpAV1wlVDqoDuZNMpas9OmT2wxrfVvhkpfArBdmKhOgnqrop4d6Rp5FLfTruv-4NlxLwU63en-FJy"} />
                    </div>
                </div>
            </nav>

            <ClientSidebar companyName={company?.company_name} handleLogout={handleLogout} />

            <main className="md:ml-64 pt-24 pb-20 px-4 md:px-10 max-w-7xl mx-auto">
                <div className="mb-10 flex justify-between items-end border-b border-outline-variant/20 pb-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-on-surface">{t('myJobs.title')}</h1>
                        <p className="text-on-surface-variant mt-2">Manage your job postings and track applicants.</p>
                    </div>
                    <button onClick={() => navigate('/post-job')} className="px-6 py-2.5 bg-primary text-white rounded-full font-bold shadow-md hover:bg-teal-800 transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">add</span> {t('clientDashboard.postNewJob')}
                    </button>
                </div>

                {myJobs.length === 0 ? (
                    <div className="text-center py-20 bg-surface-container-lowest rounded-2xl border-2 border-dashed border-outline-variant">
                        <h3 className="text-xl font-bold text-on-surface mb-2">{t('myJobs.noJobs')}</h3>
                        <button onClick={() => navigate('/post-job')} className="mt-4 px-8 py-3 bg-primary text-white font-bold rounded-full">
                            {t('clientDashboard.postNow')}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {myJobs.map((job) => {
                            const isEditing = editingJobId === job.id;

                            return (
                                <div key={job.id} className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/20">
                                    <div className="lg:col-span-8 space-y-6">
                                        {/* HEADER CƠ BẢN GIỮ NGUYÊN */}
                                        <header>
                                            <div className="flex items-center gap-3 mb-4">
                                                {isEditing ? (
                                                    <label className="flex items-center gap-2 cursor-pointer bg-emerald-50 px-3 py-1 rounded border border-emerald-200">
                                                        <input type="checkbox" name="is_active" checked={editFormData.is_active} onChange={handleEditChange} className="accent-primary w-4 h-4" />
                                                        <span className="text-sm font-bold text-emerald-800">{t('myJobs.active')}</span>
                                                    </label>
                                                ) : (
                                                    <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase ${job.status === 'In Progress' ? 'bg-amber-100 text-amber-700' : job.is_active ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                                                        {job.status === 'In Progress' ? t('myJobs.inProgress', 'Đang thực hiện') : job.is_active ? t('myJobs.active') : t('myJobs.inactive')}
                                                    </span>
                                                )}
                                            </div>

                                            {isEditing ? (
                                                <input type="text" name="title" value={editFormData.title} onChange={handleEditChange} className="w-full text-2xl md:text-3xl font-extrabold bg-surface-container-low border border-primary/30 focus:ring-2 focus:ring-primary rounded-lg px-4 py-2 mb-4" />
                                            ) : (
                                                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface leading-tight mb-4">{job.title}</h2>
                                            )}

                                            <div className="flex items-center gap-6 text-on-surface-variant font-medium bg-surface-container-low w-fit px-5 py-3 rounded-xl border border-outline-variant/10">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-primary">payments</span>
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-2">
                                                            <input type="number" name="budget" value={editFormData.budget} onChange={handleEditChange} className="font-bold text-slate-800 text-lg w-40 bg-white border border-primary/30 rounded px-2 py-1" />
                                                            <span>VND</span>
                                                        </div>
                                                    ) : (
                                                        <span className="font-bold text-slate-800 text-lg">{Number(job.budget).toLocaleString('vi-VN')} VND</span>
                                                    )}
                                                </div>
                                            </div>
                                        </header>

                                        <section>
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-outline mb-3">{t('postJob.jobDesc')}</h3>
                                            {isEditing ? (
                                                <textarea name="description" value={editFormData.description} onChange={handleEditChange} rows="5" className="w-full bg-white border border-primary/30 focus:ring-2 focus:ring-primary rounded-xl p-4 text-base" />
                                            ) : (
                                                <div className="text-on-surface-variant leading-relaxed text-base whitespace-pre-line bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">{job.description || "No description provided."}</div>
                                            )}
                                        </section>

                                        {/* YÊU CẦU KỸ NĂNG: ĐÃ ĐỔI SANG SELECT DROPDOWN */}
                                        <section>
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-outline mb-3">{t('postJob.requiredSkills')}</h3>
                                            {isEditing ? (
                                                <div className="space-y-3 bg-surface-container-low p-4 rounded-xl">
                                                    {editFormData.requirements.map((req, idx) => (
                                                        <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">

                                                            {/* ĐỔI INPUT THÀNH SELECT Ở ĐÂY */}
                                                            <select
                                                                value={req.skill}
                                                                onChange={(e) => handleRequirementChange(idx, 'skill', e.target.value)}
                                                                className="flex-1 w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm font-bold text-primary focus:ring-primary focus:border-primary"
                                                            >
                                                                <option value="">-- {t('postJob.skillPlaceholder')} --</option>
                                                                {availableSkills.map(skill => (
                                                                    <option key={skill.id} value={skill.name}>{skill.name}</option>
                                                                ))}
                                                            </select>

                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-slate-500">Trọng số:</span>
                                                                <input
                                                                    type="number" step="0.1" min="0.1" max="1.0"
                                                                    value={req.weight}
                                                                    onChange={(e) => handleRequirementChange(idx, 'weight', e.target.value)}
                                                                    className="w-20 bg-white border border-slate-300 rounded px-2 py-2 text-sm"
                                                                />
                                                                <button onClick={() => removeRequirement(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded ml-2">
                                                                    <span className="material-symbols-outlined text-base">close</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button onClick={addRequirement} className="text-sm font-bold text-primary flex items-center gap-1 hover:underline mt-4 px-2">
                                                        <span className="material-symbols-outlined text-sm">add</span> {t('companyProfile.addIndustry')}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-3">
                                                    {job.requirements && job.requirements.length > 0 ? (
                                                        job.requirements.map((req, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 bg-white border border-primary/20 px-4 py-2 rounded-lg shadow-sm">
                                                                <span className="font-bold text-primary">{req.skill?.name || req.skill || "Skill"}</span>
                                                                <span className="w-1 h-4 bg-outline-variant/50 rounded"></span>
                                                                <span className="text-xs font-medium text-slate-500">Weight: <span className="text-slate-800 font-bold">{req.weight || '1.0'}</span></span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-slate-400 italic">No skill requirements.</p>
                                                    )}
                                                </div>
                                            )}
                                        </section>
                                    </div>

                                    {/* CỘT PHẢI */}
                                    <aside className="lg:col-span-4 space-y-4">
                                        {!isEditing && (
                                            <div className="bg-linear-to-br from-primary to-teal-700 p-6 rounded-2xl text-black shadow-lg shadow-teal-900/20 text-center">
                                                <h3 className="text-sm font-bold opacity-80 uppercase tracking-widest mb-4">{t('myJobs.applicants')}</h3>
                                                <div className="text-5xl font-black mb-6">{job.application_count || 0}</div>
                                                <button
                                                    onClick={() => navigate(`/job-applicants/${job.id}`)}
                                                    className="w-full py-3 bg-white text-black font-black rounded-xl hover:bg-teal-50 transition-colors shadow-md flex items-center justify-center gap-2"
                                                >
                                                    {t('clientDashboard.reviewApps')} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                                </button>
                                            </div>
                                        )}

                                        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
                                            {isEditing ? (
                                                <div className="space-y-3">
                                                    <button onClick={() => saveEdit(job.id)} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white font-bold rounded-lg hover:bg-teal-800 transition-colors shadow-md">
                                                        <span className="material-symbols-outlined text-sm">save</span> Lưu thay đổi
                                                    </button>
                                                    <button onClick={cancelEditing} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-slate-700 font-bold rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors">
                                                        Hủy bỏ
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <button onClick={() => startEditing(job)} className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors border border-slate-200">
                                                        <span className="material-symbols-outlined text-slate-400">edit</span> {t('myJobs.edit')}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteJob(job.id)}
                                                        className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg transition-colors border border-red-100"
                                                    >
                                                        <span className="material-symbols-outlined">delete</span> {t('myJobs.delete')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </aside>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}

export default MyJobs;

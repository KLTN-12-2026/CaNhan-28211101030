import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';

function PublicCompanyProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [company, setCompany] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStars, setSelectedStars] = useState('all');

    const handleLogoClick = () => {
        const role = sessionStorage.getItem("user_role") || localStorage.getItem("user_role");
        if (role === "freelancer") {
            navigate("/freelancer");
        } else if (role === "client") {
            navigate("/client");
        } else {
            navigate("/");
        }
    };

    useEffect(() => {
        const fetchPublicData = async () => {
            try {
                const response = await api.get(`companies/${id}/`);
                setCompany(response.data);
                if (response.data.user) {
                    fetchReviews(response.data.user);
                }
            } catch (error) {
                console.error("Lỗi khi tải hồ sơ công khai:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPublicData();
    }, [id]);

    const fetchReviews = async (userId) => {
        try {
            const response = await api.get(`reviews/?reviewee_id=${userId}`);
            setReviews(response.data.results || response.data);
        } catch (error) {
            console.error("Error fetching reviews:", error);
        }
    };

    const averageRating = reviews.length > 0 
        ? (reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length).toFixed(1)
        : 0;

    const filteredReviews = selectedStars === 'all' 
        ? reviews 
        : reviews.filter(r => r.rating === Number(selectedStars));

    const starCounts = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: reviews.filter(r => r.rating === star).length
    }));

    if (loading) return <div className="flex justify-center items-center min-h-screen font-bold text-teal-700">{t('companyProfile.loading') || "Đang tải hồ sơ doanh nghiệp..."}</div>;
    if (!company) return <div className="text-center mt-20">{t('companyProfile.notFound') || "Không tìm thấy thông tin công ty."}</div>;

    return (
        <div className="bg-slate-50 min-h-screen font-['Inter'] pb-20">
            {/* Top Bar */}
            <nav className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <span onClick={handleLogoClick} className="text-xl font-black text-teal-700 tracking-tight cursor-pointer">FreelanceAI</span>
                    <button onClick={() => navigate(-1)} className="text-sm font-bold text-slate-500 hover:text-teal-600 flex items-center gap-1 transition-colors">
                        <span className="material-symbols-outlined text-base">arrow_back</span> {t('common.back')}
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="bg-white border-b border-slate-200 pt-12 pb-8">
                <div className="max-w-5xl mx-auto px-8 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-32 h-32 rounded-3xl border-4 border-slate-50 overflow-hidden shadow-xl shadow-teal-900/5 shrink-0">
                        <img
                            src={company.logo || "https://ui-avatars.com/api/?name=" + company.company_name + "&background=006b5c&color=fff"}
                            className="w-full h-full object-cover"
                            alt="Logo"
                        />
                    </div>
                    <div className="text-center md:text-left w-full">
                        <h1 className="text-3xl font-black text-slate-900">{company.company_name}</h1>
                        <p className="text-teal-600 font-medium mt-1">{company.slogan || "Đối tác tin cậy của Freelancer"}</p>
                        
                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 mt-4">
                            {company.industries?.map(ind => (
                                <span key={ind} className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                    {ind}
                                </span>
                            ))}
                            {reviews.length > 0 && (
                                <span className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                                    <span className="material-symbols-outlined fill-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                    {averageRating} ({reviews.length} {t('reviews.total')})
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-12">
                    {/* Phần Giới thiệu */}
                    <section>
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">{t('companyProfile.description')}</h2>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-line text-lg">
                            {company.description || "Công ty chưa cập nhật mô tả chi tiết."}
                        </p>
                    </section>

                    {/* Phần: CÁC VỊ TRÍ ĐANG TUYỂN */}
                    <section>
                        <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
                            <h2 className="text-xl font-black text-slate-900">{t('clientDashboard.activePostings') || "Các vị trí đang tuyển"}</h2>
                            <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-xs font-bold">
                                {company.jobs?.length || 0} công việc
                            </span>
                        </div>

                        <div className="space-y-4">
                            {company.jobs && company.jobs.length > 0 ? (
                                company.jobs.map(job => (
                                    <div 
                                        key={job.id} 
                                        onClick={() => navigate(`/jobs/${job.id}`)}
                                        className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-lg hover:shadow-teal-900/5 transition-all cursor-pointer group"
                                    >
                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 group-hover:text-teal-700 transition-colors">{job.title}</h3>
                                                <div className="flex items-center gap-3 text-slate-500 text-sm mt-2">
                                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">work</span> {job.job_type || 'Dự án'}</span>
                                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">location_on</span> {job.location || 'Remote'}</span>
                                                </div>
                                            </div>
                                            <span className="font-black text-teal-700 bg-teal-50 border border-teal-100 px-4 py-2 rounded-xl whitespace-nowrap">
                                                {job.budget || 'Thỏa thuận'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <span className="material-symbols-outlined text-slate-400 text-2xl">work_off</span>
                                    </div>
                                    <p className="text-slate-500 font-medium">Hiện tại công ty chưa có tin tuyển dụng nào.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Review Section */}
                    <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-10">
                        <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-4">
                            <span className="w-2 h-10 bg-amber-500 rounded-full"></span>
                            {t('reviews.title')}
                        </h2>

                        {reviews.length > 0 ? (
                            <div className="space-y-8">
                                <div className="bg-amber-50/30 rounded-2xl p-8 border border-amber-100 flex flex-col md:flex-row gap-8 items-center">
                                    <div className="text-center md:text-left">
                                        <div className="text-4xl font-black text-amber-600 flex items-center gap-2 justify-center md:justify-start">
                                            {averageRating} <span className="text-2xl text-amber-400">/ 5</span>
                                        </div>
                                        <div className="flex gap-0.5 mt-2 justify-center md:justify-start">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <span key={s} className="material-symbols-outlined text-amber-400" style={{ fontVariationSettings: `'FILL' ${s <= Math.round(averageRating) ? 1 : 0}` }}>star</span>
                                            ))}
                                        </div>
                                        <p className="text-amber-800/60 text-sm font-bold mt-2">{reviews.length} {t('reviews.total')}</p>
                                    </div>

                                    <div className="flex-1 flex flex-wrap gap-2">
                                        <button onClick={() => setSelectedStars('all')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all border ${selectedStars === 'all' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200'}`}>{t('reviews.all')}</button>
                                        {starCounts.map(({ star, count }) => (
                                            <button key={star} onClick={() => setSelectedStars(star.toString())} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all border flex items-center gap-2 ${selectedStars === star.toString() ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200'}`}>
                                                {star} <span className="material-symbols-outlined text-xs fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> ({count})
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {filteredReviews.length > 0 ? filteredReviews.map((review) => (
                                        <div key={review.id} className="p-6 rounded-2xl border border-slate-100 bg-white group">
                                            <div className="flex gap-4">
                                                <img src={review.reviewer_avatar} alt={review.reviewer_name} className="w-12 h-12 rounded-full object-cover" />
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-bold text-slate-900">{review.reviewer_name}</h4>
                                                            <div className="flex gap-0.5 my-1">
                                                                {[1, 2, 3, 4, 5].map(s => (
                                                                    <span key={s} className="material-symbols-outlined text-amber-400 text-sm" style={{ fontVariationSettings: `'FILL' ${s <= review.rating ? 1 : 0}` }}>star</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <span className="text-xs text-slate-400 font-medium">{new Date(review.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1 mb-3">
                                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{t('reviews.project')}: {review.job_title}</span>
                                                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                                                            <span className="material-symbols-outlined text-xs">verified</span> {t('reviews.verifiedHire')}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-600 text-sm leading-relaxed">{review.comment}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-20 text-center text-slate-400 font-medium">{t('reviews.noReviews')}</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
                                <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">rate_review</span>
                                <p className="text-slate-400 font-bold">{t('reviews.noReviews')}</p>
                            </div>
                        )}
                    </section>
                </div>

                {/* Cột phải */}
                <div className="space-y-6">
                    <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <h2 className="text-teal-500 text-sm font-black uppercase tracking-widest mb-6">{t('footer.contact')}</h2>
                        <div className="space-y-5">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-teal-400">location_on</span>
                                <div>
                                    <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Văn phòng</p>
                                    <p className="font-medium text-sm mt-0.5 leading-snug text-slate-800">{company.address || "Đang cập nhật"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-teal-400">call</span>
                                <div>
                                    <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Hotline</p>
                                    <p className="font-medium text-sm mt-0.5 text-slate-800">{company.phone || "---"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-teal-400">language</span>
                                <div>
                                    <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Website</p>
                                    {company.website ? <a href={company.website} target="_blank" rel="noreferrer" className="font-medium text-sm mt-0.5 text-slate-800 hover:text-teal-600 break-all">{company.website}</a> : <p className="text-slate-400 text-sm">---</p>}
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Thông tin nhanh</h3>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between border-b border-slate-50 pb-2">
                                <span className="text-slate-500">Quy mô</span>
                                <span className="font-bold text-slate-900">{company.size}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-50 pb-2">
                                <span className="text-slate-500">Thành lập</span>
                                <span className="font-bold text-slate-900">{company.founded_year || "---"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default PublicCompanyProfile;
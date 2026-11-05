import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api";

const fetchPublicFreelancerProfile = async (id) => {
  const profileResponse = await api.get(`freelancers/${id}/`);
  const nextProfile = profileResponse.data;
  let nextReviews = [];

  if (nextProfile.user) {
    const reviewsResponse = await api.get(`reviews/?reviewee_id=${nextProfile.user}`);
    nextReviews = reviewsResponse.data.results || reviewsResponse.data;
  }

  return { profile: nextProfile, reviews: nextReviews };
};

const PublicFreelancerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStars, setSelectedStars] = useState("all");

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
    let isActive = true;

    fetchPublicFreelancerProfile(id)
      .then(({ profile: nextProfile, reviews: nextReviews }) => {
        if (!isActive) return;

        setProfile(nextProfile);
        setReviews(nextReviews);
      })
      .catch((error) => {
        console.error("Error fetching public freelancer profile:", error);
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [id]);

  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length
        ).toFixed(1)
      : 0;

  const filteredReviews =
    selectedStars === "all"
      ? reviews
      : reviews.filter((r) => r.rating === Number(selectedStars));

  const starCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );

  if (!profile)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          Không tìm thấy hồ sơ ứng viên
        </h2>
        <button
          onClick={() => navigate(-1)}
          className="text-teal-600 font-semibold hover:underline"
        >
          Quay lại
        </button>
      </div>
    );

  return (
    <div className="bg-[#f8fafc] min-h-screen font-body text-slate-900 antialiased pt-24 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-3 flex items-center justify-between shadow-sm">
        <span
          onClick={handleLogoClick}
          className="text-2xl font-black text-teal-700 cursor-pointer"
        >
          FreelanceAI
        </span>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 font-bold hover:text-teal-600 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>{" "}
          {t("common.back")}
        </button>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Header Card */}
        <div className="lg:col-span-12">
          <article className="bg-white rounded-3xl shadow-sm border border-slate-200 p-10 flex flex-col md:flex-row gap-10 items-center md:items-start text-center md:text-left">
            <img
              src={
                profile.avatar ||
                "https://ui-avatars.com/api/?name=" + profile.full_name
              }
              alt={profile.full_name}
              className="w-40 h-40 rounded-full object-cover ring-4 ring-teal-50 shadow-lg"
            />
            <div className="flex-1 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-4">
                <div>
                  <h1 className="text-4xl font-black text-slate-900 mb-1">
                    {profile.full_name}
                  </h1>
                  <p className="text-xl font-bold text-teal-600 uppercase tracking-wide">
                    {profile.professional_title || "Chuyên gia Freelance"}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="bg-teal-50 px-6 py-3 rounded-2xl border border-teal-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600">
                      payments
                    </span>
                    <span className="text-xl font-black text-teal-900">
                      {Number(profile.hourly_rate || 0).toLocaleString("vi-VN")}{" "}
                      VNĐ/giờ
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(`/chat?user_id=${profile.user}`)}
                    className="w-full py-3 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg"
                  >
                    <span className="material-symbols-outlined text-sm">
                      chat
                    </span>{" "}
                    {t("sidebar.messages")}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-slate-500 font-semibold">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-teal-500">
                    location_on
                  </span>{" "}
                  {profile.location || "Remote"}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-teal-500">
                    mail
                  </span>{" "}
                  {profile.user_info?.email}
                </span>
                {reviews.length > 0 && (
                  <span className="flex items-center gap-1 text-amber-500">
                    <span
                      className="material-symbols-outlined fill-amber-500"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    {averageRating} ({reviews.length} {t("reviews.total")})
                  </span>
                )}
              </div>
              <p className="text-slate-600 leading-relaxed text-lg max-w-4xl mx-auto md:mx-0">
                {profile.bio || "Ứng viên chưa cung cấp giới thiệu chi tiết."}
              </p>
              <div className="flex flex-wrap gap-2 pt-4">
                {profile.skill_list?.map((skill) => (
                  <span
                    key={skill}
                    className="px-5 py-2 bg-slate-50 text-slate-700 rounded-full text-xs font-bold border border-slate-100"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </article>
        </div>

        {/* Left Side: Experience & Education & REVIEWS */}
        <div className="lg:col-span-8 space-y-8">
          {/* Kinh nghiệm */}
          <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-10">
            <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-4">
              <span className="w-2 h-10 bg-teal-600 rounded-full"></span>
              Kinh nghiệm làm việc
            </h2>
            <div className="space-y-10 border-l-2 border-teal-50 pl-8 ml-4">
              {profile.work_experiences?.length > 0 ? (
                profile.work_experiences.map((exp, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-10.25 top-0 w-4 h-4 bg-teal-600 rounded-full border-4 border-white shadow-sm"></div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-bold text-slate-900">
                          {exp.position}
                        </h3>
                        <span className="bg-teal-50 text-teal-600 px-3 py-1 rounded-lg text-xs font-black">
                          {exp.duration}
                        </span>
                      </div>
                      <p className="text-teal-700 font-bold">{exp.company}</p>
                      <p className="text-slate-600 leading-relaxed">
                        {exp.description}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 italic">
                  Chưa có thông tin kinh nghiệm.
                </p>
              )}
            </div>
          </section>

          {/* Học vấn */}
          <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-10">
            <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-4">
              <span className="w-2 h-10 bg-indigo-500 rounded-full"></span>
              Học vấn & Bằng cấp
            </h2>
            <div className="space-y-10 border-l-2 border-indigo-50 pl-8 ml-4">
              {profile.educations?.length > 0 ? (
                profile.educations.map((edu, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-10.25 top-0 w-4 h-4 bg-indigo-500 rounded-full border-4 border-white shadow-sm"></div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-bold text-slate-900">
                          {edu.degree}
                        </h3>
                        <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-black">
                          {edu.duration}
                        </span>
                      </div>
                      <p className="text-indigo-700 font-bold">{edu.school}</p>
                      <p className="text-slate-600 leading-relaxed">
                        {edu.description}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 italic">
                  Chưa có thông tin học vấn.
                </p>
              )}
            </div>
          </section>

          {/* Đánh giá Shopee-style */}
          <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-10">
            <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-4">
              <span className="w-2 h-10 bg-amber-500 rounded-full"></span>
              {t("reviews.title")}
            </h2>

            {reviews.length > 0 ? (
              <div className="space-y-8">
                {/* Overview Card */}
                <div className="bg-amber-50/30 rounded-2xl p-8 border border-amber-100 flex flex-col md:flex-row gap-8 items-center">
                  <div className="text-center md:text-left">
                    <div className="text-4xl font-black text-amber-600 flex items-center gap-2 justify-center md:justify-start">
                      {averageRating}{" "}
                      <span className="text-2xl text-amber-400">/ 5</span>
                    </div>
                    <div className="flex gap-0.5 mt-2 justify-center md:justify-start">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span
                          key={s}
                          className="material-symbols-outlined text-amber-400"
                          style={{
                            fontVariationSettings: `'FILL' ${s <= Math.round(averageRating) ? 1 : 0}`,
                          }}
                        >
                          star
                        </span>
                      ))}
                    </div>
                    <p className="text-amber-800/60 text-sm font-bold mt-2">
                      {reviews.length} {t("reviews.total")}
                    </p>
                  </div>

                  <div className="flex-1 flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedStars("all")}
                      className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all border ${selectedStars === "all" ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20" : "bg-white text-slate-600 border-slate-200 hover:border-amber-500"}`}
                    >
                      {t("reviews.all")}
                    </button>
                    {starCounts.map(({ star, count }) => (
                      <button
                        key={star}
                        onClick={() => setSelectedStars(star.toString())}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all border flex items-center gap-2 ${selectedStars === star.toString() ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20" : "bg-white text-slate-600 border-slate-200 hover:border-amber-500"}`}
                      >
                        {star}{" "}
                        <span
                          className="material-symbols-outlined text-xs fill-current"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>{" "}
                        ({count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reviews List */}
                <div className="space-y-6">
                  {filteredReviews.length > 0 ? (
                    filteredReviews.map((review) => (
                      <div
                        key={review.id}
                        className="p-6 rounded-2xl border border-slate-100 hover:border-amber-200 transition-colors bg-white group"
                      >
                        <div className="flex gap-4">
                          <img
                            src={review.reviewer_avatar}
                            alt={review.reviewer_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-slate-900">
                                  {review.reviewer_name}
                                </h4>
                                <div className="flex gap-0.5 my-1">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <span
                                      key={s}
                                      className="material-symbols-outlined text-amber-400 text-sm"
                                      style={{
                                        fontVariationSettings: `'FILL' ${s <= review.rating ? 1 : 0}`,
                                      }}
                                    >
                                      star
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <span className="text-xs text-slate-400 font-medium">
                                {new Date(
                                  review.created_at,
                                ).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-1 mb-3">
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                {t("reviews.project")}: {review.job_title}
                              </span>
                              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-xs">
                                  verified
                                </span>{" "}
                                {t("reviews.verifiedHire")}
                              </span>
                            </div>

                            <p className="text-slate-600 text-sm leading-relaxed">
                              {review.comment}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center text-slate-400 font-medium">
                      {t("reviews.noReviews")}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">
                  rate_review
                </span>
                <p className="text-slate-400 font-bold">
                  {t("reviews.noReviews")}
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Right Side: CV & Summary */}
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-linear-to-br from-teal-900 to-teal-800 rounded-3xl p-10 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <span className="material-symbols-outlined text-8xl">
                auto_awesome
              </span>
            </div>
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-300">
                psychology
              </span>{" "}
              AI Insights
            </h3>
            {profile.ai_summary_report ? (
              <div className="space-y-4">
                <p className="text-sm text-teal-100 leading-relaxed italic">
                  "{profile.ai_summary_report}"
                </p>
                <div className="pt-4 border-t border-teal-700/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">
                    Confidence Score
                  </span>
                  <span className="text-xs font-black text-white bg-teal-700 px-3 py-1 rounded-full">
                    High Match
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-teal-300">
                Không có báo cáo AI cho hồ sơ này.
              </p>
            )}
          </section>

          <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 text-center">
            <span className="material-symbols-outlined text-slate-300 text-5xl mb-4">
              picture_as_pdf
            </span>
            <h3 className="font-bold text-slate-900 mb-2">
              Hồ sơ ứng tuyển (.PDF)
            </h3>
            <p className="text-xs text-slate-500 mb-8">
              Ứng viên đã đính kèm CV chi tiết cho vị trí chuyên môn này.
            </p>
            <a
              href={profile.cv_url}
              target="_blank"
              rel="noreferrer"
              className="block w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/20"
            >
              Tải CV / Xem CV
            </a>
          </section>

          {/* Section Portfolio */}
          {profile?.portfolio_url && (
            <div className="mt-6">
              {" "}
              {/* Margin đồng bộ */}
              <h3 className="text-base font-bold text-slate-800 mb-3">
                Portfolio
              </h3>
              <a
                href={profile.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-md transition-all duration-300 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-emerald-600 group-hover:bg-emerald-50 transition-colors">
                    <span className="material-symbols-outlined text-2xl">
                      language
                    </span>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">
                      {profile.portfolio_url.replace(/^https?:\/\//, "")}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Liên kết dự án cá nhân
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">
                    open_in_new
                  </span>
                  <span>Mở link</span>
                </div>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicFreelancerProfile;

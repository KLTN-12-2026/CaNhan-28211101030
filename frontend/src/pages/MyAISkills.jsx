import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api";
import ReactMarkdown from "react-markdown";
import FreelancerSidebar from "../components/FreelancerSidebar";
import FreelancerTopNav from "../components/FreelancerTopNav";

import { toast } from 'react-hot-toast';
const MyAISkills = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  
  const steps = [
    t('myAISkills.steps.connecting') || "Đang kết nối với AI mentor...",
    t('myAISkills.steps.extracting') || "Đang trích xuất dữ liệu từ PDF CV của bạn...",
    t('myAISkills.steps.evaluating') || "Đang đánh giá kỹ năng và điểm mạnh của bạn...",
    t('myAISkills.steps.roadmapping') || "Đang xây dựng lộ trình phát triển cá nhân hóa...",
  ];

  const [analysis, setAnalysis] = useState(null);
  const [profile, setProfile] = useState(null);
  const userId = sessionStorage.getItem("user_id");

    useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("freelancers/");
        const allProfiles = res.data.results || res.data;
        const myProfile = allProfiles.find(p => String(p.user) === String(userId));
        setProfile(myProfile);
        if (myProfile && myProfile.learning_roadmap) {
          setAnalysis(myProfile.learning_roadmap);
        }
      } catch (err) {
        console.error("Không thể lấy thông tin profile", err);
      }
    };
    if (userId) fetchProfile();
  }, [userId]);

  const handleLogout = (e) => {
    if (e) e.preventDefault();
    if (window.confirm(t('common.logoutConfirm') || "Bạn có chắc chắn muốn đăng xuất không?")) {
        sessionStorage.clear();
        localStorage.clear();
        navigate('/');
    }
  };

  const handleDeepAnalysis = async () => {
    setLoading(true);
    setLoadingStep(0);

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 2500);

    try {
      const res = await api.post("/ai-analyze-cv/");
      if (res.data.analysis) {
        setAnalysis(res.data.analysis);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || t('aiChat.cvReadError') || "Cần upload CV trước!");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen font-body text-slate-900 antialiased flex">
      <FreelancerSidebar
        profile={profile}
        username={sessionStorage.getItem("username")}
        handleLogout={handleLogout}
      />
      
      <div className="flex-1 flex flex-col min-h-screen md:pl-64">
        <FreelancerTopNav profile={profile} username={sessionStorage.getItem("username")} notifications={[]} />

        <div className="flex pt-24 min-h-screen">
          <div className="flex-1 p-8 border-r border-slate-200/60">
            <div className="max-w-3xl mx-auto w-full">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-xl font-bold text-slate-800">
                    {t('myAISkills.title') || 'My AI Skills'}
                  </h1>
                  <p className="text-slate-500 text-sm mt-1 font-medium">
                    {t('myAISkills.subtitle') || 'Đánh giá năng lực & Lộ trình phát triển bằng giải pháp AI'}
                  </p>
                </div>
                <span className="bg-teal-50 text-teal-600 text-[10px] font-bold px-3 py-1 rounded-full border border-teal-100 uppercase tracking-wider">
                  AI Analysis Ready
                </span>
              </div>

              <div className="bg-white rounded-[2rem] p-16 border border-slate-200/60 shadow-[0_10px_40px_rgba(0,0,0,0.03)] mb-8 text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-teal-50 rounded-full blur-3xl opacity-50"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-orange-50 rounded-full blur-3xl opacity-50"></div>

                <div className="relative z-10">
                  <div className="w-24 h-24 bg-linear-to-br from-teal-50 to-white rounded-[2rem] shadow-inner flex items-center justify-center mx-auto mb-8 border border-teal-100/50 transform group-hover:scale-110 transition-transform duration-500">
                    <span className="material-symbols-outlined text-5xl text-teal-600 font-light">
                      temp_preferences_custom
                    </span>
                  </div>

                  <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tighter">
                    {t('myAISkills.mentorTitle') || 'AI Career Mentor'}
                  </h2>
                  <p className="text-slate-500 text-base max-w-md mx-auto mb-10 leading-relaxed font-medium">
                    {t('myAISkills.mentorDesc') || 'Phân tích sâu CV của bạn với AI để khám phá những cơ hội tiềm ẩn và lộ trình sự nghiệp tối ưu nhất.'}
                  </p>

                  <button
                    onClick={handleDeepAnalysis}
                    disabled={loading}
                    className="bg-[#006b5c] text-white px-12 py-4 rounded-2xl font-bold shadow-xl shadow-teal-900/10 hover:shadow-teal-900/20 hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-3 mx-auto disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {loading ? "sync" : "magic_button"}
                    </span>
                    <span className="text-lg">
                      {loading ? (t('myAISkills.readingCV') || "Đang đọc CV của bạn...") : (t('myAISkills.startAnalysis') || "Bắt đầu Phân tích")}
                    </span>
                  </button>

                  {loading && (
                    <div className="mt-12 w-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
                      <div className="w-full max-w-sm h-1.5 bg-slate-100 rounded-full overflow-hidden mb-6 shadow-inner">
                        <div
                          className="h-full bg-[#006b5c] transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,107,92,0.4)]"
                          style={{ width: `${(loadingStep + 1) * 25}%` }}
                        ></div>
                      </div>

                      <div className="flex flex-col items-center text-center">
                        <span className="material-symbols-outlined text-teal-600 animate-spin text-3xl mb-3">
                          autorenew
                        </span>

                        <div className="space-y-1">
                          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-800 leading-none">
                            {steps[loadingStep]}
                          </p>
                          <p className="text-[10px] text-slate-400 italic font-medium">
                            {t('myAISkills.processingNote') || 'Hệ thống đang xử lý dữ liệu phức tạp, vui lòng đợi...'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {analysis && (
                    <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700 mx-auto max-w-4xl text-left">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="h-px flex-1 bg-slate-200"></div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">
                          {t('aiChat.cvAnalysisTitle') || 'KẾT QUẢ PHÂN TÍCH CHI TIẾT'}
                        </h3>
                        <div className="h-px flex-1 bg-slate-200"></div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-[2rem] p-8 border border-emerald-100 shadow-sm flex flex-col">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                              <span className="material-symbols-outlined text-emerald-600">
                                verified
                              </span>
                            </div>
                            <h4 className="font-bold text-emerald-900">
                              {t('aiChat.strengths') || 'Điểm mạnh cốt lõi'}
                            </h4>
                          </div>
                          <div className="prose prose-sm prose-emerald max-w-none text-slate-600 flex-1 whitespace-pre-wrap">
                            <ReactMarkdown>
                              {typeof analysis === 'string'
                                ? (analysis.split(/điểm yếu|cần cải thiện/i)[0] || "AI đang đánh giá các điểm mạnh của bạn...")
                                : (analysis.strengths?.join("\n\n") || "AI đang đánh giá các điểm mạnh của bạn...")
                              }
                            </ReactMarkdown>
                          </div>
                        </div>

                        <div className="bg-white rounded-[2rem] p-8 border border-orange-100 shadow-sm flex flex-col">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                              <span className="material-symbols-outlined text-orange-600">
                                trending_up
                              </span>
                            </div>
                            <h4 className="font-bold text-orange-900">
                              {t('aiChat.weaknesses') || 'Cần cải thiện'}
                            </h4>
                          </div>
                          <div className="prose prose-sm prose-orange max-w-none text-slate-600 flex-1 whitespace-pre-wrap">
                            <ReactMarkdown>
                              {typeof analysis === 'string'
                                ? (analysis.match(/điểm yếu|cần cải thiện([\s\S]*?)(?=lộ trình|kế hoạch)/i)?.[1] || "AI không tìm thấy điểm yếu cụ thể.")
                                : (analysis.weaknesses?.join("\n\n") || "AI không tìm thấy điểm yếu cụ thể.")
                              }
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#006b5c] rounded-[2rem] p-10 shadow-xl shadow-teal-900/10 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <span className="material-symbols-outlined text-[120px]">
                            alt_route
                          </span>
                        </div>

                        <div className="relative z-10">
                          <div className="flex flex-col items-center text-center mb-8">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mb-4 shadow-inner">
                              <span className="material-symbols-outlined text-white text-3xl">
                                moving
                              </span>
                            </div>

                            <div className="flex flex-col items-center">
                              <h4 className="font-black text-white text-2xl tracking-tighter uppercase">
                                {t('myAISkills.strategyTitle') || 'Chiến lược phát triển 2026'}
                              </h4>
                              <p className="text-teal-100 text-[10px] mt-2 opacity-80 uppercase tracking-[0.4em] font-black">
                                Action Plan
                              </p>
                            </div>
                          </div>
                          <div className="space-y-12 relative before:absolute before:left-4.25 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {analysis && (analysis.roadmap || (Array.isArray(analysis) ? analysis : [])).map((milestone, mIdx) => (
                  <div key={mIdx} className="relative pl-12 group">
                    {/* Timeline Dot */}
                    <div className="absolute left-0 top-1 w-9 h-9 rounded-full bg-white border-2 border-teal-500 flex items-center justify-center text-teal-600 font-bold shadow-sm group-hover:bg-teal-500 group-hover:text-white transition-all z-10">
                      {mIdx + 1}
                    </div>

                    {/* Milestone Card */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                          <h3 className="text-2xl font-black text-slate-900 group-hover:text-teal-700 transition-colors">{milestone.milestone}</h3>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {milestone.key_outcomes?.map((outcome, oIdx) => (
                              <span key={oIdx} className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-[11px] font-bold border border-teal-100 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                {outcome}
                              </span>
                            ))}
                          </div>
                        </div>
                        {milestone.milestone_badge && (
                          <div className="shrink-0 w-16 h-16 bg-linear-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
                            <span className="material-symbols-outlined text-3xl">workspace_premium</span>
                          </div>
                        )}
                      </div>

                      {/* Tasks List */}
                      <div className="space-y-4 mb-8">
                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">list_alt</span>
                          Lộ trình học tập
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {milestone.tasks?.map((task, tIdx) => (
                            <div key={tIdx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-teal-200 hover:bg-white transition-all group/task">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
                                  task.priority === 'Critical' ? 'bg-rose-100 text-rose-600' :
                                  task.priority === 'Important' ? 'bg-amber-100 text-amber-600' :
                                  'bg-blue-100 text-blue-600'
                                }`}>
                                  {task.priority}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">{task.estimated_time}</span>
                              </div>
                              <p className="text-sm font-bold text-slate-800 leading-snug mb-3">{task.task}</p>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs text-slate-400">
                                    {task.resource_type === 'video' || task.resource_type === 'youtube' ? 'play_circle' : 
                                     task.resource_type === 'course' ? 'school' : 'description'}
                                  </span>
                                  <span className="text-[10px] font-medium text-slate-500 capitalize">{task.resource_type}</span>
                                </div>
                                <div className="flex gap-1">
                                  {task.multiple_learning_links?.map((link, lIdx) => (
                                    <a key={lIdx} href={link.url} target="_blank" rel="noreferrer" 
                                       className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:shadow-md transition-all"
                                       title={link.title}>
                                      <span className="material-symbols-outlined text-sm">link</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Projects Section */}
                      {milestone.suggested_projects && milestone.suggested_projects.length > 0 && (
                        <div className="pt-6 border-t border-slate-100">
                          <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-sm">terminal</span>
                            Dự án thực hành
                          </h4>
                          <div className="space-y-3">
                            {milestone.suggested_projects.map((project, pIdx) => (
                              <div key={pIdx} className="p-5 rounded-2xl bg-linear-to-r from-slate-900 to-slate-800 text-white shadow-lg relative overflow-hidden group/project">
                                <div className="absolute -right-5 -top-5 opacity-10 group-hover/project:scale-110 transition-transform">
                                  <span className="material-symbols-outlined text-8xl">code</span>
                                </div>
                                <div className="relative z-10">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[10px] font-black px-2 py-0.5 bg-white/20 rounded uppercase tracking-widest">{project.difficulty}</span>
                                    <h5 className="font-bold text-lg">{project.title}</h5>
                                  </div>
                                  <p className="text-xs text-slate-300 leading-relaxed max-w-xl">{project.description}</p>
                                  {project.github_template && (
                                    <a href={project.github_template} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors">
                                      <span className="material-symbols-outlined text-sm">account_tree</span>
                                      View Template on GitHub
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
                        </div>
                      </div>

                      <div className="flex justify-center pt-6">
                        <button className="flex items-center gap-2 text-slate-400 hover:text-teal-600 transition-all text-[11px] font-black uppercase tracking-[0.2em] group">
                          <span className="material-symbols-outlined text-sm">
                            download
                          </span>
                          {t('myAISkills.exportPDF') || 'Xuất file báo cáo (PDF)'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="w-80 p-6 hidden lg:block">
            <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
              {t('aiChat.suggestions') || 'Gợi ý cho bạn'}{" "}
              <span className="material-symbols-outlined text-sm text-teal-600 font-bold">
                flare
              </span>
            </h3>

            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm group cursor-pointer hover:border-teal-300 transition-all">
                <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-teal-600 text-sm">
                    menu_book
                  </span>
                </div>
                <h4 className="text-xs font-bold mb-1 group-hover:text-teal-600">
                  {t('myAISkills.howToWriteCV') || 'Cách viết CV chuẩn AI'}
                </h4>
                <p className="text-[10px] text-slate-500">
                  {t('myAISkills.howToWriteCVDesc') || 'Mẹo giúp AI trích xuất kỹ năng chính xác 99%.'}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-orange-600 text-sm">
                    trending_up
                  </span>
                </div>
                <h4 className="text-xs font-bold mb-1">{t('myAISkills.yourRanking') || 'Xếp hạng của bạn'}</h4>
                <p className="text-[10px] text-slate-500">
                  {t('myAISkills.yourRankingDesc') || 'Hồ sơ của bạn đang thuộc top 15% Freelancer.'}
                </p>
              </div>

              <div className="bg-teal-700 p-5 rounded-2xl text-white shadow-lg shadow-teal-900/20">
                <p className="text-[10px] font-bold opacity-70 uppercase mb-2">
                  AI Insight
                </p>
                <p className="text-xs leading-relaxed font-medium">
                  {t('myAISkills.hotSkillInsight', { skill: 'React' }) || 'Kỹ năng **React** của bạn đang rất được các Client săn đón tuần này.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default MyAISkills;

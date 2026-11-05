import React from 'react';
import { useTranslation } from 'react-i18next';

function LearningInterviewTab({
    interviewData,
    interviewFilterCat,
    setInterviewFilterCat,
    interviewFilterDiff,
    setInterviewFilterDiff,
    interviewFilterCompany,
    setInterviewFilterCompany,
    interviewFilterStatus,
    setInterviewFilterStatus,
    expandedQuestions,
    setExpandedQuestions,
    handlePracticeClick,
    handleSaveQuestion,
    savedQuestionIds,
    practiceHistory,
    setSelectedQuestion,
    setReviewResult,
    setPracticeModalOpen,
    generatingInterview,
    handleGenerateInterview,
    handlePrintPDF,
    careerGoal
}) {
    const { t } = useTranslation();

    if (!interviewData) {
        return (
            <div className="space-y-8">
                <div className="bg-white rounded-[2rem] p-12 text-center border border-dashed border-slate-300 max-w-2xl mx-auto">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-4xl text-indigo-500">record_voice_over</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No Interview Kit Found</h3>
                    <p className="text-slate-500 mb-8">AI Technical Recruiter will create a real-world question set based on your career goals.</p>
                    <button 
                        onClick={() => handleGenerateInterview(true)}
                        disabled={generatingInterview || !careerGoal}
                        className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/20 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none inline-flex items-center gap-2"
                    >
                        {generatingInterview ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">magic_button</span>}
                        {generatingInterview ? 'AI is drafting documents...' : 'Generate Interview Kit'}
                    </button>
                    {!careerGoal && <p className="text-xs text-rose-500 mt-4">Please return to the Learning Roadmap tab to define your career goal first.</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-600">forum</span>
                        {t('learning.interview.title')}
                    </h2>
                    <div className="flex flex-wrap gap-2 justify-end">
                        <select 
                            value={interviewFilterCat}
                            onChange={(e) => setInterviewFilterCat(e.target.value)}
                            className="bg-white border border-slate-200 text-sm font-medium text-slate-600 px-3 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            <option value="All">{t('findJobs.allCategories')}</option>
                            {[...new Set((interviewData.question_bank || []).map(q => q.category))].map((c, i) => (
                                <option key={i} value={c}>{c}</option>
                            ))}
                        </select>
                        <select 
                            value={interviewFilterDiff}
                            onChange={(e) => setInterviewFilterDiff(e.target.value)}
                            className="bg-white border border-slate-200 text-sm font-medium text-slate-600 px-3 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 print:hidden"
                        >
                            <option value="All">{t('findJobs.allLevels')}</option>
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                        <select 
                            value={interviewFilterCompany}
                            onChange={(e) => setInterviewFilterCompany(e.target.value)}
                            className="bg-white border border-slate-200 text-sm font-medium text-slate-600 px-3 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 print:hidden"
                        >
                            <option value="All">{t('learning.interview.allEnvironments')}</option>
                            <option value="FAANG">{t('learning.interview.faang')}</option>
                            <option value="Startup">{t('learning.interview.startup')}</option>
                            <option value="Product">{t('learning.interview.product')}</option>
                            <option value="Outsource">{t('learning.interview.outsource')}</option>
                        </select>
                        <select 
                            value={interviewFilterStatus}
                            onChange={(e) => setInterviewFilterStatus(e.target.value)}
                            className="bg-white border border-slate-200 text-sm font-medium text-slate-600 px-3 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 print:hidden"
                        >
                            <option value="All">Tất cả trạng thái</option>
                            <option value="Saved">Đã lưu</option>
                            <option value="Practiced">Đã luyện tập</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-4 printable-area interview-list-container">
                    {(interviewData.question_bank || []).filter(q => 
                        (interviewFilterCat === 'All' || q.category === interviewFilterCat) && 
                        (interviewFilterDiff === 'All' || q.difficulty === interviewFilterDiff) && 
                        (interviewFilterCompany === 'All' || !q.company_type || q.company_type === interviewFilterCompany) &&
                        (interviewFilterStatus === 'All' || 
                            (interviewFilterStatus === 'Saved' && savedQuestionIds.includes(q.id)) ||
                            (interviewFilterStatus === 'Practiced' && practiceHistory?.some(h => h.question_text === q.question))
                        )
                    ).map((q, qIdx) => (
                        <div key={qIdx} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                            <div 
                                onClick={() => setExpandedQuestions(prev => ({...prev, [qIdx]: !prev[qIdx]}))}
                                className="p-5 flex items-start gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                                <div className="mt-1">
                                    <span className={`material-symbols-outlined ${q.type === 'Behavioral' ? 'text-amber-500' : 'text-indigo-500'}`}>
                                        {q.type === 'Behavioral' ? 'psychology' : 'code'}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{q.category}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${q.difficulty === 'Easy' ? 'bg-green-50 text-green-600' : q.difficulty === 'Hard' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>{t(`learning.${q.difficulty.toLowerCase()}`)}</span>
                                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md">{q.type}</span>
                                        {q.company_type && <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md border border-purple-200">{q.company_type}</span>}
                                        {savedQuestionIds.includes(q.id) && <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1"><span className="material-symbols-outlined text-[10px]" style={{fontVariationSettings: "'FILL' 1"}}>bookmark</span>Đã lưu</span>}
                                        {practiceHistory?.some(h => h.question_text === q.question) && <span className="text-[10px] font-bold bg-teal-50 text-teal-600 px-2 py-0.5 rounded-md border border-teal-200 flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">history</span>Đã làm</span>}
                                    </div>
                                    <h3 className="font-bold text-slate-800 text-base leading-relaxed">{q.question}</h3>
                                </div>
                                <div className="flex flex-col items-center gap-2 print:hidden">
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handlePracticeClick(q);
                                            }} 
                                            className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition-colors border border-indigo-100"
                                        >
                                            {t('learning.practice').toUpperCase()}
                                        </button>
                                        {q.id && (
                                            <button onClick={(e) => handleSaveQuestion(e, q.id)} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors" title={t('learning.saveQuestion')}>
                                                <span className={`material-symbols-outlined ${savedQuestionIds.includes(q.id) ? 'fill-current text-indigo-500' : ''}`} style={savedQuestionIds.includes(q.id) ? {fontVariationSettings: "'FILL' 1"} : {}}>bookmark</span>
                                            </button>
                                        )}
                                    </div>
                                    <span className={`material-symbols-outlined text-slate-400 transition-transform ${expandedQuestions[qIdx] ? 'rotate-180' : ''}`}>expand_more</span>
                                </div>
                            </div>
                            {(expandedQuestions[qIdx] || window.matchMedia("print").matches) && (
                                <div className="p-5 pt-0 border-t border-slate-100 mt-2 bg-slate-50/50">
                                    <div className="pt-4">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">lightbulb</span>
                                            Key Concepts / STAR Method
                                        </h4>
                                        <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-200">{q.key_concepts_or_star}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                
                {/* LỊCH SỬ LUYỆN TẬP */}
                {practiceHistory?.length > 0 && (
                    <div className="mt-12">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-600">history</span>
                                Practice History
                            </h2>
                            <span className="text-xs text-slate-400 font-medium">Showing last 20 attempts</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {practiceHistory.map((h) => (
                                <div key={h.id} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:border-indigo-200 transition-all group">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(h.created_at).toLocaleDateString('vi-VN')}</span>
                                        <div className={`px-2 py-1 rounded-lg text-xs font-black ${h.score >= 80 ? 'bg-green-50 text-green-600' : h.score >= 60 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {h.score}/100
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-sm line-clamp-2 mb-4 h-10">{h.question_text}</h4>
                                    <button 
                                        onClick={() => {
                                            setSelectedQuestion({ question: h.question_text, type: h.question_type });
                                            setReviewResult(h.ai_feedback);
                                            setPracticeModalOpen(true);
                                        }}
                                        className="w-full py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
                                    >
                                        View AI Feedback
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                <div className="bg-linear-to-br from-indigo-900 to-indigo-800 rounded-3xl p-6 text-white shadow-xl flex flex-col items-center text-center relative overflow-hidden">
                    <div className="relative z-10 w-full">
                        <h3 className="font-bold mb-6 flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-indigo-300">target</span>
                            Interview Readiness
                        </h3>
                        <div className="relative w-32 h-32 mx-auto flex items-center justify-center mb-6">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
                                <circle 
                                    cx="50" cy="50" r="40" fill="transparent" 
                                    stroke={interviewData.interview_readiness_score >= 80 ? '#34d399' : interviewData.interview_readiness_score >= 60 ? '#fbbf24' : '#f87171'} 
                                    strokeWidth="12" 
                                    strokeDasharray="251.2" 
                                    strokeDashoffset={251.2 - (251.2 * (interviewData.interview_readiness_score || 0)) / 100}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black">{interviewData.interview_readiness_score || 0}</span>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => handleGenerateInterview(true)}
                            disabled={generatingInterview}
                            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-colors border border-white/20 flex items-center justify-center gap-2 mb-3"
                        >
                            {generatingInterview ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">refresh</span>}
                            {generatingInterview ? t('common.loading') : 'Generate New Question Set'}
                        </button>
                        <button 
                            onClick={handlePrintPDF}
                            className="w-full py-2.5 bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-100 rounded-xl text-sm font-bold transition-colors border border-indigo-500/30 flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">print</span>
                            Export PDF
                        </button>
                    </div>
                    <span className="material-symbols-outlined absolute -right-8 -bottom-8 text-9xl text-white/5 rotate-12 pointer-events-none">model_training</span>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500 text-sm">tips_and_updates</span>
                        Practice Tips
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        {interviewData.practice_suggestions}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default LearningInterviewTab;

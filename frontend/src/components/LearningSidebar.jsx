import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';

function LearningSidebar({
    analysis,
    radarData,
    setProjectModalOpen
}) {
    const { t } = useTranslation();

    return (
        <div className="space-y-8">
            {/* OVERVIEW METRICS */}
            {analysis && (
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm flex flex-col items-center">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 w-full justify-center">
                            <span className="material-symbols-outlined text-indigo-500">speed</span>
                            {t('learning.skillScore')}
                        </h3>
                        <div className="relative w-32 h-32 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                                <circle 
                                    cx="50" cy="50" r="40" fill="transparent" 
                                    stroke={analysis.job_readiness_score >= 80 ? '#10b981' : analysis.job_readiness_score >= 60 ? '#f59e0b' : '#ef4444'} 
                                    strokeWidth="12" 
                                    strokeDasharray="251.2" 
                                    strokeDashoffset={251.2 - (251.2 * (analysis.job_readiness_score || 0)) / 100}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-slate-800">{analysis.job_readiness_score || 0}</span>
                                <span className="text-[10px] text-slate-500 font-bold">/100</span>
                            </div>
                        </div>
                        {analysis.estimated_total_time && (
                            <div className="mt-6 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold flex items-center gap-2 border border-indigo-100 w-full justify-center">
                                <span className="material-symbols-outlined text-lg">timelapse</span>
                                Est. Time: {analysis.estimated_total_time}
                            </div>
                        )}
                        {analysis.next_milestone_recommendation && (
                            <p className="mt-4 text-xs text-slate-500 text-center leading-relaxed">
                                <span className="font-bold text-slate-700">Weekly Tip: </span>
                                {analysis.next_milestone_recommendation}
                            </p>
                        )}
                    </div>

                    {(analysis.jd_skills?.length > 0 || analysis.skills_gap?.length > 0) && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-rose-500 text-sm">troubleshoot</span>
                                Skills Gap Analysis
                            </h3>
                            
                            {analysis.jd_skills?.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Common in JD</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {analysis.jd_skills.map((skill, i) => (
                                            <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md border border-slate-200">{skill}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {analysis.skills_gap?.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Missing Skills</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {analysis.skills_gap.map((skill, i) => (
                                            <span key={i} className="px-2 py-1 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-md border border-rose-200">{skill}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* RADAR CHART */}
            {radarData.length > 0 && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-teal-600 text-sm">radar</span>
                        {t('learning.aiAnalysis')}
                    </h3>
                    <div className="h-50 w-full">
                        <ResponsiveContainer width="100%" height={200} minWidth={0}>
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Tiến độ" dataKey="A" stroke="#0d9488" fill="#14b8a6" fillOpacity={0.5} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* PROJECT GENERATOR */}
            <div className="bg-linear-to-br from-indigo-900 to-indigo-800 rounded-3xl p-6 text-white shadow-xl shadow-indigo-900/10 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-indigo-300">engineering</span>
                        <h3 className="font-bold text-lg">{t('learning.project.title')}</h3>
                    </div>
                    <p className="text-xs text-indigo-200 mb-4 leading-relaxed">
                        Learning is not just about points, but real-world products. AI designs personalized projects for your Portfolio.
                    </p>
                    <button 
                        onClick={() => setProjectModalOpen(true)}
                        className="w-full py-3 bg-white text-indigo-900 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-colors shadow-lg shadow-black/10 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">magic_button</span>
                        {t('learning.project.generate')}
                    </button>
                </div>
                <span className="material-symbols-outlined absolute -right-8 -bottom-8 text-9xl text-white/5 rotate-12 pointer-events-none">code_blocks</span>
            </div>
        </div>
    );
}

export default LearningSidebar;

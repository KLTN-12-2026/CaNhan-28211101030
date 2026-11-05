import React from 'react';
import { useTranslation } from 'react-i18next';

function LearningHero({
    careerGoal,
    setCareerGoal,
    handleGenerateRoadmap,
    analyzing,
    analysis,
    profile,
    progress,
    completedTasks,
    handleClearGoals
}) {
    const { t } = useTranslation();

    return (
        <div className="mb-10 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200/60 relative overflow-hidden">
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                    <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-bold mb-4 border border-rose-100">
                        <span className="material-symbols-outlined text-sm">local_fire_department</span>
                        {t('learning.xpStreak')}
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">{t('learning.targetTitle')}</h1>
                    <p className="text-slate-500 mb-6 leading-relaxed">{t('learning.targetSubtitle')}</p>
                    
                    {!analysis ? (
                        <div className="flex gap-3 max-w-md">
                            <input 
                                type="text" 
                                value={careerGoal}
                                onChange={(e) => setCareerGoal(e.target.value)}
                                placeholder={t('learning.goalPlaceholder')}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                            />
                            <button 
                                onClick={handleGenerateRoadmap}
                                disabled={analyzing}
                                className="bg-teal-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-900/10 disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center min-w-30"
                            >
                                {analyzing ? <span className="material-symbols-outlined animate-spin">sync</span> : t('learning.createRoadmap')}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('learning.currentGoal')}</span>
                                <span className="font-bold text-slate-800">{careerGoal || profile?.career_goal || "Unknown"}</span>
                            </div>
                            <button 
                                onClick={() => {
                                    if (window.confirm(t('learning.confirmChangeGoal'))) {
                                        if (handleClearGoals) handleClearGoals();
                                    }
                                }}
                                className="text-teal-600 text-sm font-bold hover:underline flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">refresh</span>
                                {t('learning.changeGoal')}
                            </button>
                        </div>
                    )}
                </div>
                <div className="hidden lg:flex justify-end gap-4">
                    <div className="bg-teal-50 rounded-3xl p-6 border border-teal-100 w-full max-w-50 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-teal-600 uppercase">{t('learning.overallProgress')}</span>
                            <span className="text-xl font-black text-teal-700">{progress}%</span>
                        </div>
                        <div className="w-full bg-teal-200/40 h-3 rounded-full mb-2 overflow-hidden">
                            <div className="bg-teal-600 h-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="text-[9px] text-teal-600/70 font-medium">Completed {Object.keys(completedTasks).length} {t('learning.tasksCompleted')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LearningHero;

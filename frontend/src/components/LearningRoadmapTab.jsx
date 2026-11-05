import React from 'react';
import { useTranslation } from 'react-i18next';

function LearningRoadmapTab({
    analysis,
    expandedMilestones,
    setExpandedMilestones,
    getMilestoneIcon,
    completedTasks,
    handleTaskClick
}) {
    const { t } = useTranslation();

    if (!analysis) {
        return (
            <div className="xl:col-span-2 space-y-6">
                <div className="bg-white rounded-[2rem] p-12 text-center border border-dashed border-slate-300">
                    <span className="material-symbols-outlined text-5xl text-slate-200 mb-4">rocket_launch</span>
                    <p className="text-slate-400 font-medium">{t('learning.noRoadmap')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600">route</span>
                    {t('learning.roadmapTab')}
                </h2>
                <span className="text-xs font-medium text-slate-500 bg-slate-200/50 px-3 py-1 rounded-full border border-slate-200">
                    Click task to start AI Quiz
                </span>
            </div>

            <div className="space-y-4">
                {analysis.roadmap?.map((milestone, mIdx) => (
                    <div key={mIdx} className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
                        <div 
                            onClick={() => setExpandedMilestones(prev => ({...prev, [mIdx]: !prev[mIdx]}))}
                            className="p-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 shrink-0 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center overflow-hidden">
                                    <span className="material-symbols-outlined">{getMilestoneIcon(milestone.milestone_badge)}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">{milestone.milestone}</h3>
                                    {milestone.key_outcomes && milestone.key_outcomes.length > 0 && (
                                        <p className="text-xs text-slate-500 mt-1">Goal: {milestone.key_outcomes.join(', ')}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-500 font-bold uppercase tracking-wider">
                                    {milestone.tasks?.length || 0} {t('learning.tasks')}
                                </span>
                                <span className={`material-symbols-outlined text-slate-400 transition-transform ${expandedMilestones[mIdx] ? 'rotate-180' : ''}`}>
                                    expand_more
                                </span>
                            </div>
                        </div>
                        
                        {expandedMilestones[mIdx] && (
                            <div className="p-5 space-y-6">
                                {milestone.suggested_projects && milestone.suggested_projects.length > 0 && (
                                    <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/50">
                                        <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">rocket_launch</span>
                                            {t('learning.project.title')}
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {milestone.suggested_projects.map((proj, pIdx) => (
                                                <div key={pIdx} className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h5 className="font-bold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors">{proj.title}</h5>
                                                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${proj.difficulty === 'beginner' ? 'bg-green-100 text-green-700' : proj.difficulty === 'advanced' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {proj.difficulty || 'Normal'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">{proj.description}</p>
                                                    {proj.github_template && (
                                                        <a href={proj.github_template} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded hover:bg-slate-200 transition-colors">
                                                            <span className="material-symbols-outlined text-[12px]">code</span>
                                                            Template
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {milestone.tasks?.map((task, tIdx) => {
                                        const isDone = completedTasks[`${mIdx}-${tIdx}`];
                                        return (
                                            <div 
                                                key={tIdx} 
                                                className={`p-4 rounded-2xl transition-all border group ${isDone ? 'bg-teal-50/30 border-teal-100 opacity-70' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
                                            >
                                                <div className="flex gap-4">
                                                    <div 
                                                        onClick={() => handleTaskClick(mIdx, tIdx, task.task)}
                                                        className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border-2 transition-all cursor-pointer ${isDone ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-600/20' : 'border-slate-200 bg-slate-50 text-slate-400 group-hover:border-teal-500 group-hover:text-teal-500 group-hover:bg-teal-50'}`}
                                                        title={t('learning.startQuiz')}
                                                    >
                                                        {isDone ? <span className="material-symbols-outlined text-lg font-bold">check</span> : <span className="material-symbols-outlined text-lg">quiz</span>}
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                                task.priority === 'Critical' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                                task.priority === 'Important' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                            }`}>
                                                                {task.priority || t('learning.recommended')}
                                                            </span>
                                                            {task.difficulty && (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 uppercase">
                                                                    {task.difficulty}
                                                                </span>
                                                            )}
                                                            {task.estimated_time && (
                                                                <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                                                                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                                                                    {task.estimated_time}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className={`text-sm font-medium ${isDone ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{task.task}</p>
                                                        
                                                        {!isDone && task.multiple_learning_links && task.multiple_learning_links.length > 0 && (
                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                {task.multiple_learning_links.map((link, lIdx) => (
                                                                    <a 
                                                                        key={lIdx}
                                                                        href={link.url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-white hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[14px]">
                                                                            {link.type === 'video' ? 'play_circle' : link.type === 'coding' ? 'code' : 'menu_book'}
                                                                        </span>
                                                                        {link.title}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default LearningRoadmapTab;

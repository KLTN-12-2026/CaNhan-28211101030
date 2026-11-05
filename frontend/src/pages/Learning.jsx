/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import FreelancerSidebar from '../components/FreelancerSidebar';
import LearningHero from '../components/LearningHero';
import LearningRoadmapTab from '../components/LearningRoadmapTab';
import LearningSidebar from '../components/LearningSidebar';
import LearningInterviewTab from '../components/LearningInterviewTab';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';

// Synth sound effects using Web Audio API (Bulletproof, no static file paths needed)
const playSound = (type, muted) => {
    if (muted) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        if (type === 'quiz-complete') {
            // Delightful arpeggio
            const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
                gain.gain.setValueAtTime(0.06, ctx.currentTime + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.1 + 0.4);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + idx * 0.1);
                osc.stop(ctx.currentTime + idx * 0.1 + 0.5);
            });
        } else if (type === 'level-up') {
            // Rising brassy triumphant tone
            const now = ctx.currentTime;
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(220, now); // A3
            osc1.frequency.exponentialRampToValueAtTime(880, now + 0.8); // A5
            
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(277.18, now); // C#4
            osc2.frequency.exponentialRampToValueAtTime(1108.73, now + 0.8); // C#6
            
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
            
            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 1.2);
            osc2.stop(now + 1.2);
        }
    } catch (e) {
        console.error("Audio synthesis error:", e);
    }
};

const SPECIALTY_PRESETS = [
    { id: 'Frontend', name: 'Frontend Engineer', icon: 'developer_mode', desc: 'React, Vue, Tailwind CSS' },
    { id: 'Backend', name: 'Backend Engineer', icon: 'dns', desc: 'Django, Node.js, PostgreSQL' },
    { id: 'Fullstack', name: 'Fullstack Developer', icon: 'layers', desc: 'SaaS Web Apps end-to-end' },
    { id: 'AI/Data', name: 'AI & Data Specialist', icon: 'neurology', desc: 'Gemini AI, Python, ML models' },
    { id: 'UI/UX', name: 'UI/UX Designer', icon: 'palette', desc: 'Figma prototypes, design systems' }
];
import { useLearningProfile, useUpdateProfile } from '../hooks/learning/useLearningProfile';
import { useLearningRoadmap } from '../hooks/learning/useLearningRoadmap';
import { usePracticeHistory, useGenerateInterview, useSaveInterviewQuestion, useReviewInterviewAnswer } from '../hooks/learning/useInterviewPractice';
import { useProjectGenerator } from '../hooks/learning/useProjectGenerator';
import { useQuiz } from '../hooks/learning/useQuiz';

import { toast } from 'react-hot-toast';
function Learning() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const userId = sessionStorage.getItem('user_id');

    // XỬ LÝ ĐĂNG XUẤT
    const handleLogout = (e) => {
        if (e) e.preventDefault();
        if (window.confirm(t('common.logoutConfirm'))) {
            sessionStorage.clear();
            navigate('/');
        }
    };

    
    // CAREER & ONBOARDING STATES
    const [goalPreference, setGoalPreference] = useState("both"); // "task" | "project" | "both"
    const [monthlyTarget, setMonthlyTarget] = useState(() => {
        const saved = localStorage.getItem("monthly_target");
        return saved ? parseInt(saved) : 800;
    });
    const [weeklyHours, setWeeklyHours] = useState(() => {
        const saved = localStorage.getItem("weekly_hours");
        return saved ? parseInt(saved) : 15;
    });

    useEffect(() => {
        localStorage.setItem("monthly_target", monthlyTarget);
    }, [monthlyTarget]);

    useEffect(() => {
        localStorage.setItem("weekly_hours", weeklyHours);
    }, [weeklyHours]);
    
    const [analyzing, setAnalyzing] = useState(false);
    
    // AUDIO SETTINGS
    const [isMuted, setIsMuted] = useState(false);

    // DYNAMIC MATCHING OPPORTUNITIES STATE
    const [opportunities, setOpportunities] = useState([]);
    const [oppLoading, setOppLoading] = useState(false);
    const [activeMilestoneSkills, setActiveMilestoneSkills] = useState("");
    const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState(0);

    // STATES FOR SECURE AI QUIZ
    
    // HOOKS
    const { data: profiles, isLoading: profileLoading } = useLearningProfile({ enabled: !!userId });
    const updateProfileMutation = useUpdateProfile();
    const generateRoadmapMutation = useLearningRoadmap();
    const generateInterviewMutation = useGenerateInterview();
    const saveQuestionMutation = useSaveInterviewQuestion();
    const reviewAnswerMutation = useReviewInterviewAnswer();
    const generateQuizMutation = useQuiz();
    const generateProjectMutation = useProjectGenerator();
    const { data: practiceHistoryData = [] } = usePracticeHistory({ enabled: !!userId });

    const myProfile = profiles ? (Array.isArray(profiles.results) ? profiles.results.find(p => String(p.user) === String(userId)) : (Array.isArray(profiles) ? profiles.find(p => String(p.user) === String(userId)) : profiles)) : null;

    const profile = myProfile;
    const loading = profileLoading;
    const xp = myProfile?.xp || 0;
    const level = myProfile?.level || 1;
    const analysis = myProfile?.learning_roadmap || null;
    const completedTasks = useMemo(() => myProfile?.completed_tasks || {}, [myProfile?.completed_tasks]);
    const savedProjects = myProfile?.saved_projects || [];
    const interviewData = myProfile?.interview_prep_data || null;

    const [localCareerGoal, setLocalCareerGoal] = useState("");
    useEffect(() => {
        if (myProfile?.career_goal) setLocalCareerGoal(myProfile.career_goal);
    }, [myProfile?.career_goal]);
    const careerGoal = localCareerGoal;
    const setCareerGoal = setLocalCareerGoal;

    const [quizModalOpen, setQuizModalOpen] = useState(false);
    const [currentQuiz, setCurrentQuiz] = useState([]);
    const [activeTaskKey, setActiveTaskKey] = useState(null);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizResult, setQuizResult] = useState(null);

    // STATES FOR MINI PROJECT GENERATOR
    const [projectModalOpen, setProjectModalOpen] = useState(false);
    const [projectTopic, setProjectTopic] = useState("");
    const [generatedProject, setGeneratedProject] = useState(null);
    const [savingProject, setSavingProject] = useState(false);
    const [expandedMilestones, setExpandedMilestones] = useState({0: true});
    const [radarData, setRadarData] = useState([]);
    const [activeTab, setActiveTab] = useState("roadmap");
    const [interviewFilterCat, setInterviewFilterCat] = useState("All");
    const [interviewFilterDiff, setInterviewFilterDiff] = useState("All");
    const [interviewFilterCompany, setInterviewFilterCompany] = useState("All");
    const [interviewFilterStatus, setInterviewFilterStatus] = useState("All");
    const [expandedQuestions, setExpandedQuestions] = useState({});
    const [savedQuestionIds, setSavedQuestionIds] = useState([]);
    const [practiceHistory, setPracticeHistory] = useState([]);
    const [practiceModalOpen, setPracticeModalOpen] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [userAnswer, setUserAnswer] = useState("");
    const [reviewResult, setReviewResult] = useState(null);
    const [error, setError] = useState(null);
    const [quizLoading, setQuizLoading] = useState(false);
    const [projectLoading, setProjectLoading] = useState(false);

    // Safely map milestone_badge to valid Material Icons
    const getMilestoneIcon = (badgeStr) => {
        if (!badgeStr) return 'flag';
        const lower = badgeStr.toLowerCase();
        if (lower.includes('junior') || lower.includes('beginner') || lower.includes('1')) return 'school';
        if (lower.includes('mid') || lower.includes('intermediate') || lower.includes('2')) return 'military_tech';
        if (lower.includes('senior') || lower.includes('advanced') || lower.includes('3')) return 'workspace_premium';
        if (lower.includes('expert') || lower.includes('master')) return 'diamond';
        if (!badgeStr.includes('_level') && badgeStr.length < 20 && /^[a-z_]+$/.test(badgeStr)) return badgeStr;
        return 'flag';
    };

    // FETCH REAL-TIME OPPORTUNITIES FROM DJANGO BACKEND
    const fetchOpportunities = async (skillsList = "", preference = "both") => {
        setOppLoading(true);
        try {
            const skillsParam = skillsList || (analysis?.skills_gap || []).join(',');
            const res = await api.get(`ai-engine/recommended-opportunities/?skills=${encodeURIComponent(skillsParam)}&goal_preference=${preference}`);
            setOpportunities(res.data.opportunities || []);
        } catch (err) {
            console.error("Lỗi khi tải việc làm đề xuất:", err);
        } finally {
            setOppLoading(false);
        }
    };

    // FETCH OPPORTUNITIES WHEN ACTIVE MILESTONE OR PREFERENCE CHANGES
    useEffect(() => {
        if (analysis) {
            fetchOpportunities(activeMilestoneSkills, goalPreference);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeMilestoneSkills, goalPreference, analysis]);

    // ANTI-CHEAT FRONTEND: WARN USER WHEN SWITCHING TABS DURING ACTIVE QUIZ
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && quizModalOpen && !quizResult) {
                toast.error("CẢNH BÁO CHỐNG GIAN LẬN (Anti-Cheat Active): Vui lòng không chuyển tab hoặc rời màn hình khi đang làm bài test để đảm bảo kết quả trung thực!");
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [quizModalOpen, quizResult]);


    useEffect(() => {
        if (practiceHistoryData) {
            setPracticeHistory(practiceHistoryData);
        }
    }, [practiceHistoryData]);

    useEffect(() => {
        if (myProfile?.saved_interview_question_ids) {
            setSavedQuestionIds(myProfile.saved_interview_question_ids);
        }
    }, [myProfile?.saved_interview_question_ids]);

    // AGGREGATE QUESTION BANK WITH SAVED QUESTIONS
    const aggregatedInterviewData = useMemo(() => {
        if (!interviewData) return null;
        let baseQuestions = [...(interviewData.question_bank || [])];
        const savedData = myProfile?.saved_interview_questions_data || [];
        
        // Add saved questions if they are not already in the base questions
        const baseIds = new Set(baseQuestions.map(q => q.id).filter(Boolean));
        savedData.forEach(sq => {
            if (!baseIds.has(sq.id)) {
                baseQuestions.push(sq);
            }
        });
        return { ...interviewData, question_bank: baseQuestions };
    }, [interviewData, myProfile?.saved_interview_questions_data]);

    // GENERATE CORE SKILLS RADAR DATA BASED ON REAL SKILL GAPS/JD SKILLS
    const generateRadarData = (roadmapData, completed) => {
        if (!roadmapData) return;
        
        // Extract 6-8 core technical skills from the roadmap analysis
        const jdSkills = roadmapData.jd_skills || [];
        const gapSkills = roadmapData.skills_gap || [];
        const uniqueSkills = [...new Set([...jdSkills, ...gapSkills])].slice(0, 6);

        if (uniqueSkills.length === 0) {
            // Fallback to milestone name extraction
            const fallbackSkills = {};
            roadmapData.roadmap?.forEach((m, mIdx) => {
                const skillName = m.milestone.split(':')[0].substring(0, 15);
                if (!fallbackSkills[skillName]) fallbackSkills[skillName] = { total: 0, done: 0 };
                m.tasks?.forEach((task, tIdx) => {
                    fallbackSkills[skillName].total++;
                    if (completed[`${mIdx}-${tIdx}`]) fallbackSkills[skillName].done++;
                });
            });

            const data = Object.keys(fallbackSkills).map(key => ({
                subject: key,
                A: fallbackSkills[key].total === 0 ? 0 : Math.round((fallbackSkills[key].done / fallbackSkills[key].total) * 100),
                fullMark: 100,
            }));
            
            while (data.length < 3) data.push({ subject: 'Core Tech', A: 40, fullMark: 100 });
            setRadarData(data.slice(0, 6));
            return;
        }

        // Map real skills to levels calculated by completed tasks
        const totalRoadmapTasks = roadmapData.roadmap?.reduce((acc, m) => acc + (m.tasks?.length || 0), 0) || 1;
        const totalCompleted = Object.keys(completed).length;
        const completionRate = Math.round((totalCompleted / totalRoadmapTasks) * 100);

        const data = uniqueSkills.map((skill, index) => {
            // Assign varying baseline progress values based on completion rate + skill gaps
            const isMissing = gapSkills.includes(skill);
            const baselineProgress = isMissing ? 30 : 65;
            const computedProgress = Math.min(100, baselineProgress + Math.round(completionRate * 0.4));
            return {
                subject: skill.substring(0, 12),
                A: computedProgress,
                fullMark: 100
            };
        });

        while (data.length < 3) data.push({ subject: 'Soft Skills', A: 70, fullMark: 100 });
        setRadarData(data);
    };

    useEffect(() => {
        if (analysis) {
            generateRadarData(analysis, completedTasks);
        }
    }, [analysis, completedTasks]);

    useEffect(() => {
        if (quizResult) {
            setTimeout(() => {
                const element = document.getElementById('quiz-result-view');
                if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [quizResult]);





    const handleClearGoals = () => {
        if (!profile) return;
        updateProfileData({ learning_roadmap: null, interview_prep_data: null });
        setCareerGoal("");
    };

    const updateProfileData = (updateData) => {
        if (!profile) return;
        updateProfileMutation.mutate({ id: profile.id, updateData });
    };

    const handleGenerateRoadmap = () => {
        if (!profile?.cv_url) {
            setError(t('profile.noCV'));
            return;
        }
        setError(null);
        generateRoadmapMutation.mutate(careerGoal, {
            onSuccess: () => {
                setExpandedMilestones({0: true});
                updateProfileData({ completed_tasks: {} });
            },
            onError: (err) => {
                setError(err.response?.data?.error || t('learning.analyzing'));
            }
        });
    };

    const handleGenerateInterview = (forceAi = false) => {
        setError("");
        const payload = { company_type: interviewFilterCompany };
        if (forceAi) payload.force_ai = true;
        
        generateInterviewMutation.mutate(payload, {
            onSuccess: () => {
                setExpandedQuestions({});
            },
            onError: (err) => {
                setError(err.response?.data?.error || t('learning.interview.generating'));
            }
        });
    };

    const handleSaveQuestion = (e, qId) => {
        e.stopPropagation();
        if (!qId) return;
        saveQuestionMutation.mutate(qId, {
            onSuccess: (res) => {
                if (res.data.status === 'saved') {
                    setSavedQuestionIds(prev => [...prev, qId]);
                } else {
                    setSavedQuestionIds(prev => prev.filter(id => id !== qId));
                }
            },
            onError: (err) => {
                toast.error(err.response?.data?.error || t('common.loading'));
            }
        });
    };

    // PRACTICE CLICK
    const handlePracticeClick = (question) => {
        setSelectedQuestion(question);
        setPracticeModalOpen(true);
        setUserAnswer("");
        setReviewResult(null);
    };

    // SUBMIT MOCK INTERVIEW RESPONSE
    const handleSubmitAnswer = async () => {
        if (!userAnswer.trim()) return;
        setReviewResult(null);
        reviewAnswerMutation.mutate(
            { 
                question_text: selectedQuestion.question,
                question_type: selectedQuestion.type,
                user_answer: userAnswer 
            },
            {
                onSuccess: (resData) => {
                    const data = resData.review || resData;
                    setReviewResult(data);
                    if (data.score >= 80) {
                        playSound('quiz-complete', isMuted);
                        confetti({
                            particleCount: 80,
                            spread: 60,
                            origin: { y: 0.8 }
                        });
                    }
                },
                onError: (err) => {
                    console.error("Lỗi chấm điểm:", err);
                    toast.error(err.response?.data?.error || "Có lỗi xảy ra khi chấm điểm.");
                }
            }
        );
    };

    const handlePrintPDF = () => {
        window.print();
    };

    // CLICKING A TASK (Triggers AI quiz request with task_key)
    const handleTaskClick = async (mIdx, tIdx, taskTitle) => {
        const key = `${mIdx}-${tIdx}`;
        setActiveTaskKey(key);
        setQuizModalOpen(true);
        setCurrentQuiz([]);
        setQuizAnswers({});
        setQuizResult(null);
        setQuizLoading(true);

        try {
            const response = await api.post('ai-engine/generate-quiz/', {
                task_title: taskTitle,
                career_goal: careerGoal,
                task_key: key
            });
            setCurrentQuiz(response.data.quiz);
        } catch (err) {
            console.error("Lỗi sinh quiz", err);
            setQuizResult({ success: false, message: t('learning.quiz.failed') });
        } finally {
            setQuizLoading(false);
        }
    };

    // SECURE BACKEND GRADED SUBMISSION
    const handleSubmitQuiz = async () => {
        if (Object.keys(quizAnswers).length < currentQuiz.length) return;
        setQuizLoading(true);
        setQuizResult(null);
        try {
            const response = await api.post('ai-engine/verify-quiz-submission/', {
                task_key: activeTaskKey,
                selected_answers: quizAnswers
            });
            
            const data = response.data;
            setQuizResult({
                success: data.success,
                score: data.score,
                total: data.total,
                details: data.details,
                message: data.success ? "" : t('learning.quiz.passingScore', { count: Math.ceil(data.total * 0.8) }) + " " + t('learning.quiz.tryAgain')
            });

            if (data.success) {
                playSound('quiz-complete', isMuted);
                confetti({
                    particleCount: 150,
                    spread: 80,
                    origin: { y: 0.6 }
                });

                const newTasks = { ...completedTasks, [activeTaskKey]: true };
                updateProfileData({ completed_tasks: newTasks });
                
                // Audio level-up chime if level upgraded
                if (data.new_level > level) {
                    setTimeout(() => {
                        playSound('level-up', isMuted);
                        confetti({
                            particleCount: 200,
                            spread: 120,
                            colors: ['#ffd700', '#ff4500', '#10b981']
                        });
                    }, 600);
                }
                
                updateProfileData({ xp: data.new_xp });
                updateProfileData({ level: data.new_level });
                
                generateRadarData(analysis, newTasks);
                fetchOpportunities(activeMilestoneSkills, goalPreference);
            }
        } catch (err) {
            console.error("Lỗi chấm điểm quiz", err);
            setQuizResult({ success: false, message: t('learning.quiz.failed') });
        } finally {
            setQuizLoading(false);
        }
    };

    // MINI PROJECT GENERATION
    const handleGenerateProject = async () => {
        setProjectLoading(true);
        setGeneratedProject(null);
        
        generateProjectMutation.mutate({
            focus_area: projectTopic,
            current_level: profile?.experience_level || "Junior"
        }, {
            onSuccess: (resData) => {
                setGeneratedProject(resData.project || resData);
            },
            onError: (error) => {
                console.error("Lỗi sinh dự án", error);
                toast.error(t('learning.quiz.failed'));
            }
        });
    };

    const handleSaveProject = async () => {
        if (!generatedProject) return;
        setSavingProject(true);
        const newSaved = [...savedProjects, generatedProject];
        updateProfileData({ saved_projects: newSaved });
        setTimeout(() => {
            setSavingProject(false);
            setProjectModalOpen(false);
            toast.success(t('learning.project.saved'));
        }, 800);
    };

    const calculateProgress = () => {
        if (!analysis || !analysis.roadmap) return 0;
        let total = 0;
        let completed = 0;
        analysis.roadmap.forEach((m, mIdx) => {
            m.tasks?.forEach((t, tIdx) => {
                total++;
                if (completedTasks[`${mIdx}-${tIdx}`]) completed++;
            });
        });
        return total === 0 ? 0 : Math.round((completed / total) * 100);
    };

    const progress = calculateProgress();

    // MILESTONE COMPLETION STATE DETECTOR
    const isMilestoneCompleted = (mIdx) => {
        if (!analysis?.roadmap?.[mIdx]) return false;
        const tasks = analysis.roadmap[mIdx].tasks || [];
        if (tasks.length === 0) return false;
        return tasks.every((_, tIdx) => completedTasks[`${mIdx}-${tIdx}`]);
    };

    const isMilestoneInProgress = (mIdx) => {
        if (!analysis?.roadmap?.[mIdx]) return false;
        if (isMilestoneCompleted(mIdx)) return false;
        const tasks = analysis.roadmap[mIdx].tasks || [];
        return tasks.some((_, tIdx) => completedTasks[`${mIdx}-${tIdx}`]) || mIdx === selectedMilestoneIndex;
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-white text-teal-650 font-bold">
                <span className="material-symbols-outlined animate-spin text-5xl mb-4">sync</span>
                <p className="text-sm tracking-wider uppercase">{t('common.loading')}</p>
            </div>
        );
    }

    const userDisplayName = profile?.user_info?.last_name || profile?.user_info?.first_name
        ? `${profile.user_info.last_name || ''} ${profile.user_info.first_name || ''}`.trim()
        : profile?.full_name || sessionStorage.getItem('username') || 'User';

    return (
        <div className="bg-slate-50 min-h-screen text-slate-900 font-['Inter'] relative antialiased selection:bg-teal-500 selection:text-slate-950">
            {/* Header/Nav Glassmorphism */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl flex justify-between items-center px-6 py-4 border-b border-slate-200/60 shadow-md">
                <div className="flex items-center gap-4">
                    <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent cursor-pointer" onClick={() => navigate('/dashboard')}>FreelanceAI</span>
                </div>
                <div className="flex items-center gap-4">
                    {/* Audio Toggle */}
                    <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className={`p-2 rounded-xl transition-all duration-200 border ${isMuted ? 'text-slate-455 border-slate-200 bg-slate-100/20' : 'text-teal-600 border-teal-500/20 bg-teal-50'}`}
                        title={isMuted ? "Unmute sounds" : "Mute sounds"}
                    >
                        <span className="material-symbols-outlined text-base">{isMuted ? 'volume_off' : 'volume_up'}</span>
                    </button>

                    <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-100 shadow-inner cursor-help" title={`Next level in ${500 - (xp % 500)} XP`}>
                        <span className="material-symbols-outlined text-teal-600 text-sm animate-pulse">stars</span>
                        <span className="text-xs font-black text-indigo-700">{xp} XP</span>
                        <span className="text-[10px] bg-indigo-600 text-white font-extrabold px-2 py-0.5 rounded-lg ml-1">LV {level}</span>
                    </div>

                    <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
                    <span className="text-sm font-semibold tracking-tight text-slate-700">
                        {userDisplayName}
                    </span>
                    <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                        <img alt="User avatar" className="w-full h-full object-cover" src={profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userDisplayName)}&background=00bfa5&color=fff`} />
                    </div>
                </div>
            </nav>

            <FreelancerSidebar profile={profile} username={sessionStorage.getItem('username')} handleLogout={handleLogout} />

            <main className="md:ml-64 pt-28 pb-20 px-4 md:px-8">
                <div className="max-w-7xl mx-auto">
                    
                    {/* Immersive Hero Onboarding */}
                    <div className="mb-10 bg-gradient-to-br from-white via-indigo-50/20 to-slate-50 rounded-[2.5rem] p-8 border border-indigo-100 shadow-md relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-400/5 rounded-full blur-[100px] pointer-events-none" />
                        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-teal-500/5 rounded-full blur-[80px] pointer-events-none" />
                        
                        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                            <div className="lg:col-span-8">
                                <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-600 px-3 py-1 rounded-full text-xs font-bold mb-4 border border-teal-100">
                                    <span className="material-symbols-outlined text-sm">local_fire_department</span>
                                    AI-POWERED GROWTH HUB
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">
                                    Lộ Trình Học Tập & <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Chinh Phục Thu Nhập</span>
                                </h1>
                                <p className="text-slate-655 text-sm md:text-base mb-8 max-w-2xl leading-relaxed">
                                    Chuyển đổi kỹ năng của bạn thành nguồn tài chính bền vững. AI phân tích CV của bạn để đề xuất lộ trình tối ưu và kết nối trực tiếp với các dự án thực tế trên sàn.
                                </p>
                                
                                {!analysis ? (
                                    <div className="space-y-6 max-w-4xl">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Bước 1: Chọn Kỹ Năng / Định Hướng Nghề Nghiệp</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                            {SPECIALTY_PRESETS.map((preset) => (
                                                <button
                                                    key={preset.id}
                                                    onClick={() => setCareerGoal(preset.name)}
                                                    className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 group ${careerGoal === preset.name ? 'border-teal-555 bg-teal-50 text-teal-650 shadow-[0_0_15px_rgba(0,191,165,0.1)]' : 'border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-50'}`}
                                                >
                                                    <span className={`material-symbols-outlined text-2xl ${careerGoal === preset.name ? 'text-teal-650' : 'text-slate-400 group-hover:text-slate-600'}`}>{preset.icon}</span>
                                                    <div>
                                                        <div className="text-xs font-black leading-snug text-slate-800">{preset.id}</div>
                                                        <div className="text-[9px] text-slate-500 mt-1 line-clamp-1">{preset.desc}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-4 items-center pt-2">
                                            <div className="w-full sm:flex-1">
                                                <input 
                                                    type="text" 
                                                    value={careerGoal}
                                                    onChange={(e) => setCareerGoal(e.target.value)}
                                                    placeholder="Hoặc tự gõ mục tiêu nghề nghiệp của bạn..."
                                                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-slate-900 shadow-sm"
                                                />
                                            </div>
                                            <button 
                                                onClick={handleGenerateRoadmap}
                                                disabled={analyzing || !careerGoal.trim()}
                                                className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 px-8 py-4 rounded-2xl font-black hover:brightness-110 active:scale-95 transition-all shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none flex items-center justify-center min-w-[180px] shrink-0"
                                            >
                                                {analyzing ? <span className="material-symbols-outlined animate-spin">sync</span> : 'Bắt Đầu Phân Tích'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 flex items-center gap-3 shadow-sm">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">MỤC TIÊU HIỆN TẠI</span>
                                            <span className="font-extrabold text-teal-650 text-sm">{careerGoal || profile?.career_goal || "Unknown"}</span>
                                        </div>
                                        <button 
                                            onClick={handleClearGoals}
                                            className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-slate-650 hover:text-rose-600 hover:border-rose-350 transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-sm">refresh</span>
                                            Thay đổi mục tiêu
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            <div className="lg:col-span-4 flex justify-end">
                                {analysis ? (
                                    <div className="bg-white rounded-3xl p-6 border border-slate-200 w-full max-w-[280px] shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-xs font-black text-indigo-650 uppercase tracking-wider">Tiến độ tổng quan</span>
                                            <span className="text-xl font-black text-teal-650">{progress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2.5 rounded-full mb-3 overflow-hidden">
                                            <div className="bg-gradient-to-r from-teal-500 to-cyan-400 h-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-bold">
                                            Đã hoàn thành {Object.keys(completedTasks).length} nhiệm vụ
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-6 text-center w-full max-w-[280px] shadow-sm">
                                        <span className="material-symbols-outlined text-slate-400 text-4xl mb-2">timeline</span>
                                        <p className="text-[11px] text-slate-500 leading-normal">Điền mục tiêu nghề nghiệp để kích hoạt phân tích năng lực.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <LearningHero 
                        careerGoal={careerGoal}
                        setCareerGoal={setCareerGoal}
                        handleGenerateRoadmap={handleGenerateRoadmap}
                        analyzing={generateRoadmapMutation.isPending}
                        analysis={analysis}
                        profile={profile}
                        progress={progress}
                        completedTasks={completedTasks}
                        handleClearGoals={handleClearGoals}
                    />

                    {error && (
                        <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl flex items-center gap-3">
                            <span className="material-symbols-outlined text-rose-400">error</span>
                            <p className="text-sm font-semibold">{error}</p>
                        </div>
                    )}

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 p-1.5 rounded-2xl mb-8 mt-2 max-w-fit shadow-inner">
                        <button 
                            onClick={() => setActiveTab("roadmap")}
                            className={`px-6 py-2.5 font-black text-sm rounded-xl transition-all duration-300 shrink-0 flex items-center gap-2 ${activeTab === "roadmap" ? "bg-teal-500 text-slate-950 shadow-md font-black" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
                        >
                            <span className="material-symbols-outlined text-sm">route</span>
                            {t('learning.roadmapTab')}
                        </button>
                        <button 
                            onClick={() => setActiveTab("interview")}
                            className={`px-6 py-2.5 font-black text-sm rounded-xl transition-all duration-300 shrink-0 flex items-center gap-2 ${activeTab === "interview" ? "bg-indigo-600 text-white shadow-md font-black" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
                        >
                            <span className="material-symbols-outlined text-sm">record_voice_over</span>
                            {t('learning.interviewTab')}
                        </button>
                    </div>

                    {activeTab === "roadmap" ? (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        <LearningRoadmapTab 
                            analysis={analysis}
                            expandedMilestones={expandedMilestones}
                            setExpandedMilestones={setExpandedMilestones}
                            getMilestoneIcon={getMilestoneIcon}
                            completedTasks={completedTasks}
                            handleTaskClick={handleTaskClick}
                        />
                        <LearningSidebar 
                            analysis={analysis}
                            radarData={radarData}
                            setProjectModalOpen={setProjectModalOpen}
                        />
                    </div>
                    ) : (
                        <LearningInterviewTab 
                            interviewData={aggregatedInterviewData}
                            interviewFilterCat={interviewFilterCat}
                            setInterviewFilterCat={setInterviewFilterCat}
                            interviewFilterDiff={interviewFilterDiff}
                            setInterviewFilterDiff={setInterviewFilterDiff}
                            interviewFilterCompany={interviewFilterCompany}
                            setInterviewFilterCompany={setInterviewFilterCompany}
                            interviewFilterStatus={interviewFilterStatus}
                            setInterviewFilterStatus={setInterviewFilterStatus}
                            expandedQuestions={expandedQuestions}
                            setExpandedQuestions={setExpandedQuestions}
                            handlePracticeClick={handlePracticeClick}
                            handleSaveQuestion={handleSaveQuestion}
                            savedQuestionIds={savedQuestionIds}
                            practiceHistory={practiceHistory}
                            setSelectedQuestion={setSelectedQuestion}
                            setReviewResult={setReviewResult}
                            setPracticeModalOpen={setPracticeModalOpen}
                            generatingInterview={generateInterviewMutation.isPending}
                            handleGenerateInterview={handleGenerateInterview}
                            handlePrintPDF={handlePrintPDF}
                            careerGoal={careerGoal}
                        />
                    )}
                </div>
            </main>

            {quizModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
                    <div className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-in fade-in duration-200">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-20 shadow-sm">
                            <div>
                                <h3 className="font-black text-base md:text-lg text-slate-800 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-teal-600 animate-pulse">verified_user</span>
                                    Bài Đánh Giá Năng Lực AI
                                </h3>
                                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-0.5">Vượt qua 80% câu hỏi để xác thực kỹ năng (+100 XP)</p>
                            </div>
                            <button onClick={() => setQuizModalOpen(false)} className="p-2 text-slate-550 hover:bg-slate-100 rounded-full transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        <div className="p-6 flex-1 bg-slate-50/50">
                            {quizLoading && currentQuiz.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <span className="material-symbols-outlined text-5xl text-teal-600 animate-spin mb-4">progress_activity</span>
                                    <p className="text-slate-600 font-bold text-xs uppercase tracking-widest animate-pulse">AI Đang Thiết Kế Bộ Đề Trắc Nghiệm...</p>
                                </div>
                            ) : quizResult ? (
                                <div className="py-8" id="quiz-result-view">
                                    <div className={`max-w-4xl mx-auto p-8 rounded-[2rem] border shadow-2xl mb-8 ${quizResult.success ? 'bg-linear-to-b from-teal-50 to-white border-teal-200' : 'bg-linear-to-b from-rose-50 to-white border-rose-200'}`}>
                                        <div className="text-center">
                                            <span className={`material-symbols-outlined text-7xl mb-3 ${quizResult.success ? 'text-teal-500 drop-shadow-[0_0_12px_rgba(0,191,165,0.4)]' : 'text-rose-600'}`}>
                                                {quizResult.success ? 'verified' : 'cancel'}
                                            </span>
                                            <h3 className={`text-5xl font-black mb-2 ${quizResult.success ? 'text-teal-655' : 'text-rose-600'}`}>
                                                {quizResult.score} / {quizResult.total}
                                            </h3>
                                            <p className={`text-sm font-extrabold mb-6 ${quizResult.success ? 'text-teal-800' : 'text-rose-800'}`}>
                                                {quizResult.success ? 'Tuyệt vời! Bạn đã xác thực kỹ năng thành công và nhận +100 XP.' : quizResult.message}
                                            </p>
                                            {!quizResult.success && (
                                                <button 
                                                    onClick={() => {
                                                        setQuizResult(null);
                                                        setQuizAnswers({});
                                                    }}
                                                    className="px-8 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"
                                                >
                                                    Thử lại ngay
                                                </button>
                                            )}
                                        </div>

                                        {/* Secure verified answer key explanations with explanation panel */}
                                        <div className="mt-12 space-y-6">
                                            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4 uppercase tracking-widest">
                                                <span className="material-symbols-outlined text-indigo-600">menu_book</span>
                                                Chi Tiết Và Giải Thích Từ AI
                                            </h4>
                                            <div className="space-y-4">
                                                {quizResult.details?.map((item, idx) => (
                                                    <div key={idx} className={`p-5 rounded-2xl border border-slate-200 transition-all ${item.is_correct ? 'bg-teal-50/30' : 'bg-rose-50/30'}`}>
                                                        <div className="flex items-start gap-3 mb-3">
                                                            <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-black ${item.is_correct ? 'bg-teal-500 text-white' : 'bg-rose-555 text-white'}`}>
                                                                {item.is_correct ? '✓' : '✗'}
                                                            </span>
                                                            <p className="text-xs md:text-sm font-bold text-slate-850 leading-relaxed">{item.question}</p>
                                                        </div>
                                                        <div className="ml-9 space-y-2">
                                                            <p className="text-xs">
                                                                <span className="font-extrabold text-slate-500">Đáp án bạn chọn: </span>
                                                                <span className={item.is_correct ? 'text-teal-655 font-extrabold' : 'text-rose-655 font-extrabold'}>
                                                                    {item.options[item.selected_answer_index] || 'Chưa chọn'}
                                                                </span>
                                                            </p>
                                                            {!item.is_correct && (
                                                                <p className="text-xs">
                                                                    <span className="font-extrabold text-slate-500">Đáp án đúng: </span>
                                                                    <span className="text-teal-655 font-extrabold">{item.options[item.correct_answer_index]}</span>
                                                                </p>
                                                            )}
                                                            <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 italic text-[11px] text-slate-600 leading-relaxed">
                                                                <span className="font-black not-italic text-slate-800 block mb-1">💡 GIẢI THÍCH:</span>
                                                                {item.explanation}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 gap-6 max-h-[60vh] overflow-y-auto pr-1">
                                        {currentQuiz.map((q, qIdx) => (
                                            <div key={qIdx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-350 transition-colors">
                                                <p className="font-extrabold text-slate-800 mb-4 text-xs md:text-sm leading-relaxed"><span className="text-teal-655 mr-1.5">Q{qIdx + 1}.</span> {q.question}</p>
                                                <div className="space-y-2">
                                                    {q.options.map((opt, oIdx) => (
                                                        <label key={oIdx} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${quizAnswers[qIdx] === oIdx ? 'bg-teal-50 border-teal-500 shadow-sm ring-1 ring-teal-500/10' : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/50'}`}>
                                                            <input 
                                                                type="radio" 
                                                                name={`q_${qIdx}`} 
                                                                className="text-teal-500 focus:ring-teal-500 focus:ring-offset-white w-4 h-4 mt-0.5 bg-white border-slate-300"
                                                                checked={quizAnswers[qIdx] === oIdx}
                                                                onChange={() => setQuizAnswers({...quizAnswers, [qIdx]: oIdx})}
                                                            />
                                                            <span className="text-xs md:text-sm font-semibold text-slate-700 leading-snug">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="pt-4 border-t border-slate-200">
                                        <button 
                                            onClick={handleSubmitQuiz}
                                            disabled={Object.keys(quizAnswers).length < currentQuiz.length}
                                            className="w-full max-w-md mx-auto block py-4 bg-teal-500 text-white rounded-xl font-black hover:brightness-110 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none shadow-md text-base"
                                        >
                                            Nộp Bài Đánh Giá
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MINI PORTFOLIO PROJECT GENERATOR MODAL */}
            {projectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
                    <div className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in duration-200">
                        <div className="p-6 bg-indigo-900 text-white border-b border-indigo-950 flex items-center justify-between shrink-0 shadow-md">
                            <div>
                                <h3 className="font-black text-base md:text-lg flex items-center gap-2">
                                    <span className="material-symbols-outlined text-indigo-400">auto_awesome</span>
                                    AI Mini Project Designer
                                </h3>
                                <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider mt-0.5">Xây dựng Portfolio ấn tượng trước nhà tuyển dụng</p>
                            </div>
                            <button onClick={() => setProjectModalOpen(false)} className="p-2 text-indigo-200 hover:bg-white/5 rounded-full transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto bg-slate-50/20 flex-1">
                            {!generatedProject ? (
                                <div className="max-w-xl mx-auto space-y-6 py-8">
                                    <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-md">
                                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                                            <span className="material-symbols-outlined text-3xl text-indigo-600">draw</span>
                                        </div>
                                        <label className="block text-base font-extrabold text-slate-800 mb-2">Chủ Đề Yêu Thích Của Bạn?</label>
                                        <p className="text-xs text-slate-500 mb-6 leading-relaxed">AI sẽ tích hợp kỹ năng của {careerGoal} để thiết kế một dự án thực chiến đặc biệt cho bạn.</p>
                                        <input 
                                            type="text" 
                                            value={projectTopic}
                                            onChange={(e) => setProjectTopic(e.target.value)}
                                            placeholder="Ví dụ: App quản lý tài chính, Hệ thống thương mại điện tử..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all mb-5 text-center text-slate-800 font-medium"
                                        />
                                        <button 
                                            onClick={handleGenerateProject}
                                            disabled={generateProjectMutation.isPending || !projectTopic}
                                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:shadow-none text-lg"
                                        >
                                            {generateProjectMutation.isPending ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">auto_awesome</span>}
                                            {generateProjectMutation.isPending ? 'Designing architecture...' : t('learning.project.generate')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-md">
                                        <div className="flex justify-between items-start mb-6">
                                            <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-snug">{generatedProject.project_title}</h2>
                                            <span className="text-[8px] bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 rounded font-black uppercase tracking-wider">PORTFOLIO READY</span>
                                        </div>
                                        
                                        <p className="text-slate-655 mb-6 leading-relaxed text-xs md:text-sm bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">{generatedProject.description}</p>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                                <h4 className="font-extrabold text-slate-800 text-xs mb-3 flex items-center gap-2 uppercase tracking-wider">
                                                    <span className="material-symbols-outlined text-sm text-indigo-600">code</span>
                                                    Công Nghệ Đề Xuất
                                                </h4>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {generatedProject.tech_stack.map((t, i) => (
                                                        <span key={i} className="px-2.5 py-1 bg-white text-slate-600 text-[10px] font-bold rounded border border-slate-200">{t}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="bg-linear-to-br from-amber-50 to-orange-50 p-5 rounded-2xl border border-amber-100 shadow-sm">
                                                <h4 className="font-extrabold text-amber-900 text-xs mb-2 flex items-center gap-2 uppercase tracking-wider">
                                                    <span className="material-symbols-outlined text-sm text-amber-600 bg-white p-1 rounded-md shadow-sm">emoji_events</span>
                                                    Kỹ Năng Đạt Được
                                                </h4>
                                                <p className="text-xs text-slate-655 leading-relaxed font-medium">{generatedProject.learning_outcomes}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-extrabold text-slate-800 text-xs mb-3 flex items-center gap-2 uppercase tracking-wider">
                                                <span className="material-symbols-outlined text-sm text-emerald-500">task_alt</span>
                                                Các Tính Năng Cốt Lõi Cần Làm
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {generatedProject.core_features.map((f, i) => (
                                                    <div key={i} className="flex items-start gap-2.5 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                        <span className="material-symbols-outlined text-emerald-500 text-sm mt-0.5">check_circle</span>
                                                        <span className="text-xs text-slate-700 font-semibold leading-relaxed">{f}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end gap-3 sticky bottom-0 bg-white pt-4 pb-2 z-10 border-t border-slate-100 mt-4">
                                        <button onClick={() => setGeneratedProject(null)} className="px-5 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors text-xs active:scale-95">Thiết kế chủ đề khác</button>
                                        <button 
                                            onClick={handleSaveProject} 
                                            disabled={savingProject}
                                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 text-xs active:scale-95"
                                        >
                                            {savingProject ? <span className="material-symbols-outlined animate-spin text-xs">sync</span> : <span className="material-symbols-outlined text-xs">bookmark_add</span>}
                                            Lưu dự án vào Portfolio
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* LIVE AI INTERVIEW COACH MODAL */}
            {practiceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
                    <div className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in duration-200">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10 shadow-sm">
                            <h3 className="font-black text-base md:text-lg text-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-600">forum</span>
                                Trình Luyện Phỏng Vấn Thực Tế STAR
                            </h3>
                            <button onClick={() => setPracticeModalOpen(false)} className="p-2 text-slate-550 hover:bg-slate-100 rounded-full transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto bg-slate-50/20 flex-1">
                            {selectedQuestion && (
                                <div className="space-y-6">
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-[8px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100">{selectedQuestion.type}</span>
                                            <span className="text-[8px] font-black uppercase tracking-wider bg-white text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">{selectedQuestion.category}</span>
                                        </div>
                                        <h4 className="font-extrabold text-slate-800 text-sm md:text-base leading-relaxed">{selectedQuestion.question}</h4>
                                    </div>

                                    {!reviewResult ? (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-black text-slate-600 uppercase tracking-widest mb-2">Câu trả lời của bạn:</label>
                                                <textarea 
                                                    value={userAnswer}
                                                    onChange={(e) => setUserAnswer(e.target.value)}
                                                    placeholder="Nhập câu trả lời của bạn tại đây... Đối với câu hỏi tình huống, khuyên dùng cấu trúc STAR (Situation, Task, Action, Result) để ghi điểm tuyệt đối."
                                                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-xs md:text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all h-40 resize-none text-slate-800 font-medium shadow-inner"
                                                />
                                            </div>
                                            <button 
                                                onClick={handleSubmitAnswer}
                                                disabled={reviewAnswerMutation.isPending || !userAnswer.trim()}
                                                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 disabled:bg-slate-300"
                                            >
                                                {reviewAnswerMutation.isPending ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">analytics</span>}
                                                {reviewAnswerMutation.isPending ? 'AI is analyzing your answer...' : 'Submit Answer'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="md:col-span-1 bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center">
                                                    <span className="text-[9px] font-black text-slate-600 uppercase mb-2">Điểm Đánh Giá</span>
                                                    <div className={`text-5xl font-black ${reviewResult.score >= 80 ? 'text-green-600' : reviewResult.score >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                        {reviewResult.score}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-500 mt-1">/ 100</span>
                                                </div>
                                                <div className="md:col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                                    <h5 className="text-xs font-black text-slate-800 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                                                        <span className="material-symbols-outlined text-indigo-600 text-sm">reviews</span>
                                                        Nhận Xét Từ AI Recruiter
                                                    </h5>
                                                    <p className="text-xs md:text-sm text-slate-655 leading-relaxed italic">"{reviewResult.feedback}"</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="bg-teal-50/30 p-5 rounded-2xl border border-teal-100">
                                                    <h5 className="text-[10px] font-black text-teal-700 uppercase mb-3 flex items-center gap-1.5 tracking-wider">
                                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                                        Điểm Mạnh
                                                    </h5>
                                                    <ul className="space-y-2">
                                                        {reviewResult.strengths?.map((s, i) => (
                                                            <li key={i} className="text-xs text-slate-655 flex items-start gap-2">
                                                                <span className="mt-1.5 w-1 h-1 rounded-full bg-teal-500 shrink-0" />
                                                                {s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div className="bg-rose-50/30 p-5 rounded-2xl border border-rose-100">
                                                    <h5 className="text-[10px] font-black text-rose-700 uppercase mb-3 flex items-center gap-1.5 tracking-wider">
                                                        <span className="material-symbols-outlined text-sm">warning</span>
                                                        Điểm Yếu Cần Khắc Phục
                                                    </h5>
                                                    <ul className="space-y-2">
                                                        {reviewResult.weaknesses?.map((w, i) => (
                                                            <li key={i} className="text-xs text-slate-655 flex items-start gap-2">
                                                                <span className="mt-1.5 w-1 h-1 rounded-full bg-rose-500 shrink-0" />
                                                                {w}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>

                                            <div className="bg-indigo-900 text-white p-6 rounded-2xl border border-indigo-950">
                                                <h5 className="text-xs font-black text-indigo-200 mb-4 flex items-center gap-1.5 uppercase tracking-wider">
                                                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                                    Phiên bản tối ưu đề xuất từ AI
                                                </h5>
                                                <div className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap text-indigo-50 opacity-95">
                                                    {reviewResult.better_version}
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => setReviewResult(null)}
                                                className="w-full py-3.5 bg-slate-550 hover:bg-slate-600 border border-slate-600 text-white font-bold rounded-xl transition-colors text-xs active:scale-95"
                                            >
                                                Luyện tập lại
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @media print {
                    nav,
                    aside,
                    button,
                    select,
                    .no-print,
                    .xl\\:col-span-4,
                    .mb-10,
                    .mb-8,
                    .border-b,
                    .flex.items-center.gap-2.bg-slate-100 {
                        display: none !important;
                    }
                    
                    body, html {
                        background: white !important;
                        color: black !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    main, .md\\:ml-64 {
                        margin-left: 0 !important;
                        padding: 0 !important;
                        max-width: 100% !important;
                        width: 100% !important;
                    }
                    
                    .xl\\:col-span-8 {
                        width: 100% !important;
                        max-width: 100% !important;
                        display: block !important;
                    }
                    
                    .print-block {
                        display: block !important;
                    }
                    
                    .bg-white {
                        border: 1px solid #e2e8f0 !important;
                        margin-bottom: 1.5rem !important;
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default Learning;

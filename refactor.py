with open('frontend/src/pages/Learning.jsx', 'r') as f:
    text = f.read()

import_statement = '''import { useLearningProfile, useUpdateProfile } from '../hooks/learning/useLearningProfile';
import { useLearningRoadmap } from '../hooks/learning/useLearningRoadmap';
import { usePracticeHistory, useGenerateInterview, useSaveInterviewQuestion, useReviewInterviewAnswer } from '../hooks/learning/useInterviewPractice';
import { useProjectGenerator } from '../hooks/learning/useProjectGenerator';
import { useQuiz } from '../hooks/learning/useQuiz';
'''
text = text.replace("import { useTranslation } from 'react-i18next';", "import { useTranslation } from 'react-i18next';\n" + import_statement)

func_start = text.find('function Learning() {')
func_body_start = text.find('const { t, i18n } = useTranslation();', func_start)
replace_start = text.find("const userId = sessionStorage.getItem('user_id');", func_body_start)
replace_end = text.find('// SCROLL TO TOP WHEN FILTER CHANGES')

new_logic = '''    const userId = sessionStorage.getItem('user_id');

    // HOOKS
    const { data: profiles, isLoading: profileLoading } = useLearningProfile({ enabled: !!userId });
    const updateProfileMutation = useUpdateProfile();
    const generateRoadmapMutation = useLearningRoadmap();
    const generateInterviewMutation = useGenerateInterview();
    const saveQuestionMutation = useSaveInterviewQuestion();
    const reviewAnswerMutation = useReviewInterviewAnswer();
    const generateQuizMutation = useQuiz();
    const generateProjectMutation = useProjectGenerator();
    const { data: practiceHistoryData = [], isLoading: historyLoading } = usePracticeHistory({ enabled: !!userId });

    const myProfile = profiles ? (Array.isArray(profiles.results) ? profiles.results.find(p => String(p.user) === String(userId)) : (Array.isArray(profiles) ? profiles.find(p => String(p.user) === String(userId)) : profiles)) : null;

    const profile = myProfile;
    const loading = profileLoading;
    const xp = myProfile?.xp || 0;
    const level = myProfile?.level || 1;
    const analysis = myProfile?.learning_roadmap || null;
    const completedTasks = myProfile?.completed_tasks || {};
    const savedProjects = myProfile?.saved_projects || [];
    const interviewData = myProfile?.interview_prep_data || null;

    const [localCareerGoal, setLocalCareerGoal] = useState("");
    useEffect(() => {
        if (myProfile?.career_goal) setLocalCareerGoal(myProfile.career_goal);
    }, [myProfile?.career_goal]);
    const careerGoal = localCareerGoal;
    const setCareerGoal = setLocalCareerGoal;

    const [error, setError] = useState(null);
    const [quizModalOpen, setQuizModalOpen] = useState(false);
    const [currentQuiz, setCurrentQuiz] = useState([]);
    const [activeTaskKey, setActiveTaskKey] = useState(null);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizResult, setQuizResult] = useState(null);
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
    const [expandedQuestions, setExpandedQuestions] = useState({});
    const [savedQuestionIds, setSavedQuestionIds] = useState([]);
    const [practiceHistory, setPracticeHistory] = useState([]);
    const [practiceModalOpen, setPracticeModalOpen] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [userAnswer, setUserAnswer] = useState("");
    const [reviewResult, setReviewResult] = useState(null);

    useEffect(() => {
        if (practiceHistoryData) {
            setPracticeHistory(practiceHistoryData);
        }
    }, [practiceHistoryData]);

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

    const generateMockRadarData = (roadmapData, completed) => {
        if (!roadmapData || !roadmapData.roadmap) return;
        const skills = {};
        roadmapData.roadmap.forEach((m, mIdx) => {
            const skillName = m.milestone.split(':')[0].substring(0, 15);
            if (!skills[skillName]) skills[skillName] = { total: 0, done: 0 };
            m.tasks.forEach((t, tIdx) => {
                skills[skillName].total++;
                if (completed[`${mIdx}-${tIdx}`]) skills[skillName].done++;
            });
        });

        const data = Object.keys(skills).map(key => ({
            subject: key,
            A: skills[key].total === 0 ? 0 : Math.round((skills[key].done / skills[key].total) * 100),
            fullMark: 100,
        }));
        
        while(data.length < 3) {
            data.push({ subject: 'Soft Skills', A: 20, fullMark: 100 });
        }
        setRadarData(data.slice(0, 6));
    };

    useEffect(() => {
        if (analysis) {
            generateMockRadarData(analysis, completedTasks);
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

    const handleLogout = (e) => {
        if (e) e.preventDefault();
        if (window.confirm(t('common.logoutConfirm'))) {
            sessionStorage.clear();
            navigate('/');
        }
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
            onSuccess: (data) => {
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
                alert(err.response?.data?.error || t('common.loading'));
            }
        });
    };

'''

text = text[:replace_start] + new_logic + text[replace_end:]

quiz_logic_start = text.find('const handleTaskClick = async (mIdx, tIdx, isDone) => {')
quiz_logic_end = text.find('const handleProjectSubmit = async (e) => {')

new_quiz_logic = '''const handleTaskClick = (mIdx, tIdx, isDone) => {
        const key = `${mIdx}-${tIdx}`;
        if (isDone) return; 

        if (analysis?.roadmap?.[mIdx]?.tasks?.[tIdx]) {
            const selectedTaskStr = analysis.roadmap[mIdx].tasks[tIdx];
            
            setQuizModalOpen(true);
            setCurrentQuiz([]);
            setQuizAnswers({});
            setQuizResult(null);
            setActiveTaskKey(key);

            generateQuizMutation.mutate({ skill_name: selectedTaskStr }, {
                onSuccess: (resData) => {
                    setCurrentQuiz(resData.questions || []);
                },
                onError: (err) => {
                    console.error("Lỗi khi tạo quiz:", err);
                    setQuizModalOpen(false);
                    alert("Không thể tạo bài kiểm tra lúc này.");
                }
            });
        }
    };

    const submitQuiz = () => {
        if (currentQuiz.length === 0) return;
        
        let correctCount = 0;
        currentQuiz.forEach((q, idx) => {
            if (quizAnswers[idx] === q.correct_option) {
                correctCount++;
            }
        });
        
        const score = (correctCount / currentQuiz.length) * 100;
        const passed = score >= 80;
        
        setQuizResult({ score, passed });
        
        if (passed && activeTaskKey) {
            const updatedCompleted = { ...completedTasks, [activeTaskKey]: true };
            updateProfileData({ completed_tasks: updatedCompleted });
        }
    };

    '''
text = text.replace(text[quiz_logic_start:quiz_logic_end], new_quiz_logic)


project_start = text.find('const handleProjectSubmit = async (e) => {')
project_end = text.find('const handlePrintPDF = () => {')

new_project_logic = '''const handleProjectSubmit = (e) => {
        e.preventDefault();
        setGeneratedProject(null);
        
        const payload = {
            focus_area: projectTopic,
            current_level: profile?.experience_level || "Junior"
        };

        generateProjectMutation.mutate(payload, {
            onSuccess: (resData) => {
                setGeneratedProject(resData.project);
            },
            onError: (err) => {
                console.error("Lỗi khi tạo project:", err);
                alert(t('learning.analyzing'));
            }
        });
    };

    const handleSaveProject = () => {
        if (!generatedProject) return;
        setSavingProject(true);
        const updatedProjects = [...savedProjects, generatedProject];
        updateProfileData({ saved_projects: updatedProjects });
        setTimeout(() => {
            setSavingProject(false);
            setProjectModalOpen(false);
            alert("Đã lưu project vào hồ sơ!");
        }, 800);
    };

    '''

text = text.replace(text[project_start:project_end], new_project_logic)


review_start = text.find('const handleReviewAnswer = async () => {')
review_end = text.find('return (', review_start)

new_review_logic = '''const handleReviewAnswer = () => {
        if (!userAnswer.trim()) return;
        
        setReviewResult(null);
        reviewAnswerMutation.mutate(
            { question_id: selectedQuestion.id, user_answer: userAnswer },
            {
                onSuccess: (resData) => {
                    setReviewResult(resData.review);
                },
                onError: (err) => {
                    console.error("Lỗi chấm điểm:", err);
                    alert("Có lỗi xảy ra khi chấm điểm.");
                }
            }
        );
    };

    '''

text = text.replace(text[review_start:review_end], new_review_logic)

text = text.replace('generatingInterview', 'generateInterviewMutation.isPending')
text = text.replace('quizLoading', 'generateQuizMutation.isPending')
text = text.replace('projectLoading', 'generateProjectMutation.isPending')
text = text.replace('reviewLoading', 'reviewAnswerMutation.isPending')
text = text.replace('analyzing', 'generateRoadmapMutation.isPending')

with open('frontend/src/pages/Learning.jsx', 'w') as f:
    f.write(text)

print('Done')

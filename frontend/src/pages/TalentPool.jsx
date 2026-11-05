import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import ClientSidebar from '../components/ClientSidebar';
import ClientTopNav from '../components/ClientTopNav';

const fetchTalentPoolData = async (userId) => {
    const compRes = await api.get('companies/');
    const allCompanies = compRes.data.results || compRes.data;
    const company = allCompanies.find(c => String(c.user) === String(userId));

    const jobsRes = await api.get('jobs/');
    const allJobs = jobsRes.data.results || jobsRes.data;
    const jobs = allJobs.filter(j => j.client === company?.id);

    const freeRes = await api.get('freelancers/');
    const freelancers = freeRes.data.results || freeRes.data;

    return { company, jobs, freelancers };
};

const TalentPool = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const userId = sessionStorage.getItem('user_id');
    const [freelancers, setFreelancers] = useState([]);
    const [myJobs, setMyJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [matchScores, setMatchScores] = useState({});
    const [loading, setLoading] = useState(() => !!userId);
    const [loadingMatches, setLoadingMatches] = useState(false);
    const [company, setCompany] = useState(null);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [sortBy, setSortBy] = useState('ai_score'); // 'ai_score', 'match_score', 'hourly_rate_low', 'hourly_rate_high', 'level'
    const [shortlist, setShortlist] = useState(() => {
        const saved = localStorage.getItem('client_shortlist');
        return saved ? JSON.parse(saved) : [];
    });
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'shortlist'

    useEffect(() => {
        if (!userId) return;

        let isActive = true;

        fetchTalentPoolData(userId)
            .then(({ company: nextCompany, jobs, freelancers: nextFreelancers }) => {
                if (!isActive) return;

                setCompany(nextCompany);
                setMyJobs(jobs);
                setFreelancers(nextFreelancers);
            })
            .catch((error) => {
                console.error("Error fetching talent pool:", error);
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

    useEffect(() => {
        localStorage.setItem('client_shortlist', JSON.stringify(shortlist));
    }, [shortlist]);

    useEffect(() => {
        if (selectedJobId) {
            fetchMatchScores(selectedJobId);
            setSortBy('match_score');
        } else {
            setMatchScores({});
            setSortBy(prev => prev === 'match_score' ? 'ai_score' : prev);
        }
    }, [selectedJobId]);

    const fetchMatchScores = async (jobId) => {
        try {
            setLoadingMatches(true);
            const res = await api.get(`jobs/${jobId}/talent_match/`);
            setMatchScores(res.data);
        } catch (error) {
            console.error("Error fetching match scores:", error);
        } finally {
            setLoadingMatches(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.clear();
        navigate('/');
    };

    const toggleShortlist = (id) => {
        setShortlist(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Hàm xác định màu sắc dựa trên số điểm
    const getScoreColor = (score) => {
        if (score >= 71) return {
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            border: 'border-emerald-100',
            badge: 'bg-emerald-600',
            icon: 'check_circle'
        };
        if (score >= 31) return {
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            border: 'border-amber-100',
            badge: 'bg-amber-500',
            icon: 'trending_up'
        };
        return {
            bg: 'bg-rose-50',
            text: 'text-rose-700',
            border: 'border-rose-100',
            badge: 'bg-rose-600',
            icon: 'warning'
        };
    };

    const categories = [
        "All", "AI & Machine Learning", "Data Science", "Blockchain", "Cyber Security",
        "Frontend (React)", "Backend (Node.js)", "Full Stack", "Mobile App (Flutter/RN)",
        "UI/UX Design", "Product Management", "Digital Marketing", "DevOps", "Python Developer"
    ];

    const filteredFreelancers = useMemo(() => {
        let result = [...freelancers];
        if (activeTab === 'shortlist') {
            result = result.filter(f => shortlist.includes(f.id));
        }
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(f => 
                f.full_name?.toLowerCase().includes(query) ||
                f.professional_title?.toLowerCase().includes(query) ||
                f.skill_list?.some(s => s.toLowerCase().includes(query))
            );
        }
        // Filter by category (Flexible matching)
        if (selectedCategory !== 'All') {
            const categoryKeywords = {
                "AI & Machine Learning": ["ai", "machine learning", "intelligence", "ml", "deep learning"],
                "Data Science": ["data science", "data analyst", "big data", "tableau", "power bi"],
                "Blockchain": ["blockchain", "web3", "crypto", "ethereum", "solidity", "smart contract"],
                "Cyber Security": ["cyber", "security", "hacker", "pentest", "infosec"],
                "Frontend (React)": ["frontend", "react", "web", "html", "css", "javascript", "js"],
                "Backend (Node.js)": ["backend", "node", "express", "server", "api", "sql", "nosql"],
                "Full Stack": ["full stack", "fullstack"],
                "Mobile App (Flutter/RN)": ["mobile", "flutter", "react native", "ios", "android", "app"],
                "UI/UX Design": ["ui", "ux", "design", "figma", "sketch", "adobe"],
                "Product Management": ["product", "manager", "pm", "owner", "po"],
                "Digital Marketing": ["marketing", "seo", "ads", "social media", "content"],
                "DevOps": ["devops", "docker", "kubernetes", "aws", "azure", "ci/cd"],
                "Python Developer": ["python", "django", "flask", "fastapi"]
            };

            const keywords = categoryKeywords[selectedCategory] || [selectedCategory.toLowerCase()];
            
            result = result.filter(f => {
                const title = f.professional_title?.toLowerCase() || "";
                const skills = f.skill_list?.map(s => s.toLowerCase()) || [];
                
                return keywords.some(kw => 
                    title.includes(kw) || 
                    skills.some(skill => skill.includes(kw))
                );
            });
        }
        result.sort((a, b) => {
            if (sortBy === 'match_score') return (matchScores[b.id] || 0) - (matchScores[a.id] || 0);
            if (sortBy === 'ai_score') return (b.ai_score || 0) - (a.ai_score || 0);
            if (sortBy === 'hourly_rate_low') return (a.hourly_rate || 0) - (b.hourly_rate || 0);
            if (sortBy === 'hourly_rate_high') return (b.hourly_rate || 0) - (a.hourly_rate || 0);
            if (sortBy === 'level') return (b.level || 1) - (a.level || 1);
            return 0;
        });
        return result;
    }, [freelancers, searchQuery, selectedCategory, sortBy, shortlist, activeTab, matchScores]);

    return (
        <div className="bg-[#f8fafc] min-h-screen font-['Inter'] antialiased flex">
            <ClientSidebar companyName={company?.company_name} handleLogout={handleLogout} />

            <div className="flex-1 md:pl-64">
                <ClientTopNav company={company} username={sessionStorage.getItem('username')} notifications={[]} />

                <main className="pt-24 pb-12 px-8">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-8">
                        <div className="max-w-2xl">
                            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight flex items-center gap-3">
                                {t('talentPool.discover')}
                                <span className="text-xs bg-teal-600 text-white px-3 py-1 rounded-full uppercase tracking-widest font-black">2026 Edition</span>
                            </h2>
                            <p className="text-slate-500 font-medium text-lg leading-relaxed">
                                {t('talentPool.desc')}
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 min-w-[320px]">
                            <label className="text-[10px] font-black uppercase tracking-widest text-teal-600 mb-2 block italic">{t('talentPool.matchForProject')}</label>
                            <select 
                                value={selectedJobId}
                                onChange={(e) => setSelectedJobId(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500/20"
                            >
                                <option value="">{t('talentPool.selectJob')}</option>
                                {myJobs.map(job => (
                                    <option key={job.id} value={job.id}>{job.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-xl shadow-2xl shadow-slate-200/50 border border-slate-100 mb-12">
                        <div className="flex flex-col xl:flex-row items-center gap-8">
                            <div className="flex-1 w-full relative group">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-teal-600 transition-colors text-2xl">search</span>
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('talentPool.searchPlaceholder')}
                                    className="w-full pl-16 pr-8 py-5 bg-slate-50 border-none rounded-[2rem] text-base font-medium focus:ring-2 focus:ring-teal-500/20 transition-all placeholder:text-slate-300"
                                />
                            </div>

                            <div className="flex items-center gap-6 w-full xl:w-auto">
                                <div className="flex flex-col gap-2 flex-1 xl:w-64">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">{t('talentPool.category')}</label>
                                    <select 
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500/20 shadow-sm"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat === 'All' ? t('talentPool.allCategories') : cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-col gap-2 flex-1 xl:w-64">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">{t('talentPool.sortBy')}</label>
                                    <select 
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500/20 shadow-sm"
                                    >
                                        {selectedJobId && <option value="match_score">{t('talentPool.matchScore')}</option>}
                                        <option value="ai_score">{t('talentPool.aiRank')}</option>
                                        <option value="hourly_rate_low">{t('talentPool.rateLowHigh')}</option>
                                        <option value="hourly_rate_high">{t('talentPool.rateHighLow')}</option>
                                        <option value="level">{t('talentPool.expLevel')}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button onClick={() => setActiveTab('all')} className={`px-8 py-3 rounded-2xl text-sm font-black transition-all ${activeTab === 'all' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                    {t('talentPool.explore')} ({freelancers.length})
                                </button>
                                <button onClick={() => setActiveTab('shortlist')} className={`px-8 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'shortlist' ? 'bg-teal-600 text-white shadow-xl shadow-teal-600/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
                                    {t('talentPool.saved')} ({shortlist.length})
                                </button>
                            </div>
                            <div className="hidden md:flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t('talentPool.aiSuggestions')}</span>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-teal-50 text-teal-600 rounded-lg text-[9px] font-bold uppercase">{selectedCategory}</span>
                                    {selectedJobId && <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-bold uppercase">{t('talentPool.activeMatching')}</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {(loading || loadingMatches) ? (
                        <div className="flex flex-col items-center justify-center py-48 gap-6">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-slate-100 border-t-teal-600 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-teal-600 animate-pulse">auto_awesome</span>
                                </div>
                            </div>
                            <p className="text-slate-400 font-black text-sm tracking-widest uppercase animate-pulse">
                                {loadingMatches ? t('talentPool.loadingMatch') : t('talentPool.searching')}
                            </p>
                        </div>
                    ) : filteredFreelancers.length === 0 ? (
                        <div className="text-center py-32 bg-white rounded-[4rem] border-4 border-dashed border-slate-50 shadow-sm">
                            <span className="material-symbols-outlined text-8xl text-slate-200 mb-6 block">person_search</span>
                            <h3 className="text-2xl font-black text-slate-800 mb-3">{t('talentPool.noTalent')}</h3>
                            <p className="text-slate-400 font-medium text-lg">{t('talentPool.noTalentDesc')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {filteredFreelancers.map((talent) => {
                                const isSaved = shortlist.includes(talent.id);
                                const score = selectedJobId ? (matchScores[talent.id] || 0) : (talent.ai_score || 0);
                                const colors = getScoreColor(score);
                                
                                return (
                                    <div key={talent.id} className="group bg-white rounded-xl border border-slate-100 p-8 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] transition-all duration-700 hover:-translate-y-3 relative overflow-hidden flex flex-col">
                                        <div className="flex justify-between items-start mb-8 relative z-10">
                                            <div className={`px-5 py-2 rounded-2xl flex items-center gap-2 shadow-sm border transition-colors duration-500 ${colors.bg} ${colors.text} ${colors.border}`}>
                                                <span className="material-symbols-outlined text-sm font-bold">{colors.icon}</span>
                                                <span className="text-xs font-black uppercase tracking-tighter italic">
                                                    {selectedJobId ? `Match: ${score}%` : `AI RANK: ${score || 'N/A'}`}
                                                </span>
                                            </div>

                                            <button 
                                                onClick={() => toggleShortlist(talent.id)}
                                                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 border-2 ${isSaved ? 'bg-teal-50 border-teal-200 text-teal-600 shadow-md' : 'bg-white border-slate-50 text-slate-300 hover:border-teal-200 hover:text-teal-600 hover:shadow-lg'}`}
                                            >
                                                <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "" }}>
                                                    {isSaved ? 'bookmark' : 'bookmark_add'}
                                                </span>
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-6 mb-8">
                                            <div className="relative shrink-0">
                                                <div className="w-28 h-28 rounded-[2rem] overflow-hidden bg-slate-50 border-4 border-white shadow-2xl relative z-10">
                                                    <img src={talent.avatar || `https://ui-avatars.com/api/?name=${talent.full_name}&background=random&size=128`} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-125" alt="" />
                                                </div>
                                                <div className={`absolute inset-0 blur-2xl rounded-full scale-75 group-hover:scale-110 transition-all duration-700 opacity-20 ${colors.badge}`}></div>
                                                {talent.level > 5 && (
                                                    <div className="absolute -bottom-2 -right-2 z-20 bg-amber-400 text-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl border-4 border-white">
                                                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-2xl font-black text-slate-900 group-hover:text-teal-600 transition-colors mb-1 truncate leading-tight">{talent.full_name}</h3>
                                                <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-4 truncate">{talent.professional_title || t('talentPool.expert')}</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex -space-x-1">
                                                        {[1, 2, 3, 4, 5].map(s => (
                                                            <span key={s} className="material-symbols-outlined text-[14px] text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                                        ))}
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400">5.0 / 20 {t('talentPool.jobsDone')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-sm text-slate-500 line-clamp-2 mb-8 font-medium leading-relaxed italic border-l-4 border-slate-100 pl-4 py-1">
                                            "{talent.bio || 'Chuyên gia giàu kinh nghiệm trong việc xây dựng các giải pháp phần mềm hiện đại và tối ưu.'}"
                                        </p>
                                        
                                        <div className="flex flex-wrap gap-2 mb-8 grow">
                                            {(talent.skill_list || ['React', 'Node.js', 'Python']).slice(0, 5).map((skill, i) => (
                                                <span key={i} className="text-[10px] font-black px-4 py-2 bg-slate-50 text-slate-500 rounded-xl border border-slate-100 group-hover:bg-teal-50 group-hover:text-teal-700 group-hover:border-teal-100 transition-all duration-300">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="pt-8 border-t border-slate-50 flex items-center justify-between mt-auto">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t('talentPool.category')}</p>
                                                <p className="text-2xl font-black text-slate-900 tracking-tighter">
                                                    {Number(talent.hourly_rate || 35).toLocaleString()}
                                                    <span className="text-xs text-slate-400 font-bold italic ml-1">{t('talentPool.hourlyRate')}</span>
                                                </p>
                                            </div>
                                            <div className="flex gap-3">
                                                <button onClick={() => navigate(`/chat?user_id=${talent.user}`)} className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-teal-600 hover:text-white transition-all active:scale-90" title={t('talentPool.sendMessage')}>
                                                    <span className="material-symbols-outlined text-[24px]">chat</span>
                                                </button>
                                                <button onClick={() => navigate(`/freelancer-profile/${talent.id}`)} className="px-8 h-12 rounded-2xl bg-teal-700 text-white font-black text-sm hover:bg-slate-900 transition-all active:scale-95 shadow-xl shadow-teal-900/10 flex items-center gap-2">
                                                    {t('talentPool.viewProfile')} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className={`absolute bottom-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:opacity-[0.08] transition-all duration-700 ${colors.text}`}>
                                            <span className="material-symbols-outlined text-[120px]">{colors.icon}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default TalentPool;

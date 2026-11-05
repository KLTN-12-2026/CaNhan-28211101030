import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import ClientSidebar from '../components/ClientSidebar';
import ClientTopNav from '../components/ClientTopNav';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
function PostJob() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const userId = sessionStorage.getItem('user_id');

    // --- 1. STATE DỮ LIỆU ---
    const [company, setCompany] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const editorRef = React.useRef(null);

    // State lưu dữ liệu form (Khớp với Django Model)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        budget: 15000000,
        is_active: true,
        project_type: 'Trọn gói',
        deadline: '',
        duration: 'Dưới 1 tháng',
        location: '',
        experience_levels: ['Junior'],
        categories: []
    });

    const expLevelsList = ['Intern', 'Fresher', 'Junior', 'Senior', 'Leader', 'Manager'];
    const specializationMapping = {
        "Frontend Development": ["React", "Vue", "Angular", "HTML", "CSS", "Tailwind CSS", "JavaScript", "TypeScript", "Next.js"],
        "Backend Development": ["Django", "Python", "Node.js", "Express", "PostgreSQL", "MongoDB", "MySQL", "PHP", "Laravel", "Ruby", "Rails", "Java", "Spring Boot"],
        "Fullstack": ["MERN", "MEAN", "Next.js", "Fullstack"],
        "Mobile (iOS/Android)": ["Flutter", "React Native", "Swift", "Kotlin", "iOS", "Android", "Xamarin", "Dart"],
        "DevOps / Cloud": ["Docker", "Kubernetes", "AWS", "Azure", "GCP", "CI/CD", "Terraform", "Jenkins"],
        "Data / AI / Machine Learning": ["TensorFlow", "PyTorch", "Scikit-Learn", "Numpy", "Pandas", "SQL", "Big Data", "Machine Learning", "AI"],
        "UI/UX Design": ["Figma", "Adobe XD", "Sketch", "UI Design", "UX Design", "User Interface", "User Experience"]
    };

    // State quản lý mảng Kỹ năng (Tương ứng với Job Requirements)
    const [skills, setSkills] = useState(['React', 'Tailwind CSS']);
    const [skillInput, setSkillInput] = useState('');

    // --- 2. LẤY DỮ LIỆU COMPANY (Cho Sidebar & TopNav) ---
    useEffect(() => {
        const fetchCompany = async () => {
            try {
                const response = await api.get('companies/');
                const allCompanies = response.data.results || response.data;
                const myCompany = allCompanies.find(c => String(c.user) === String(userId));
                if (
                  myCompany &&
                  myCompany.website &&
                  myCompany.address &&
                  myCompany.phone
                )
                  setCompany(myCompany);
                else {
                  toast(
                    "Vui lòng hoàn thiện hồ sơ công ty của bạn trước khi đăng tin!",
                  );
                  navigate("/company");
                }
            } catch (error) {
                console.error("Lỗi lấy thông tin công ty:", error);
            }
        };
        if (userId) fetchCompany();
    }, [userId, navigate]);

    // Đặt nội dung ban đầu cho trình soạn thảo khi description có sẵn
    useEffect(() => {
        if (editorRef.current && formData.description && !editorRef.current.innerHTML) {
            editorRef.current.innerHTML = formData.description;
        }
    }, [formData.description]);

    // --- 3. CÁC HÀM XỬ LÝ ---
    const handleLogout = (e) => {
        if (e) e.preventDefault();
        if (window.confirm(t('common.logoutConfirm'))) {
            sessionStorage.clear();
            navigate('/');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Thêm kỹ năng khi gõ Enter
    const handleAddSkill = (e) => {
        if (e.key === 'Enter' && skillInput.trim() !== '') {
            e.preventDefault();
            const newSkill = skillInput.trim();
            if (!skills.includes(newSkill)) {
                const updatedSkills = [...skills, newSkill];
                setSkills(updatedSkills);
                autoMapCategories(updatedSkills);
            }
            setSkillInput('');
        }
    };

    const autoMapCategories = (currentSkills) => {
        const detectedCategories = new Set();
        currentSkills.forEach(skill => {
            for (const [cat, skillList] of Object.entries(specializationMapping)) {
                if (skillList.some(s => s.toLowerCase() === skill.toLowerCase())) {
                    detectedCategories.add(cat);
                }
            }
        });
        setFormData(prev => ({ ...prev, categories: Array.from(detectedCategories) }));
    };

    const toggleExpLevel = (level) => {
        setFormData(prev => {
            const current = prev.experience_levels;
            if (current.includes(level)) {
                return { ...prev, experience_levels: current.filter(l => l !== level) };
            } else {
                return { ...prev, experience_levels: [...current, level] };
            }
        });
    };

    const addSuggestedSkill = (skill) => {
        if (!skills.includes(skill)) {
            const updatedSkills = [...skills, skill];
            setSkills(updatedSkills);
            autoMapCategories(updatedSkills);
        }
    };

    const removeSkill = (skillToRemove) => {
        const updatedSkills = skills.filter(s => s !== skillToRemove);
        setSkills(updatedSkills);
        autoMapCategories(updatedSkills);
    };

    // SUBMIT LÊN DJANGO
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
        // Ràng buộc dữ liệu cơ bản
        if (!formData.title || !formData.description) {
            toast(t('postJob.fillRequired'));
            return;
        }

        if (!company) {
            toast.error("Không tìm thấy thông tin công ty. Vui lòng kiểm tra lại hồ sơ công ty của bạn.");
            return;
        }

        if (formData.deadline) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const deadlineDate = new Date(formData.deadline);
            if (deadlineDate < today) {
                toast(t('postJob.deadlinePast') || "Hạn ứng tuyển không được ở trong quá khứ!");
                return;
            }
        }

        setLoading(true);
        console.log("Dữ liệu công ty hiện tại:", company);

        try {
            // Gói dữ liệu gửi lên Django
            const payload = {
                title: formData.title,
                description: formData.description,
                budget: Number(formData.budget),
                is_active: true,
                project_type: formData.project_type,
                deadline: formData.deadline || null,
                duration: formData.duration,
                location: formData.location,
                experience_level: formData.experience_levels.join(', '),
                category: formData.categories.join(', ') || 'General IT',
                requirements: skills.map(s => ({ skill: s, weight: 1.0 }))
            };

            console.log("Payload gửi đi (đã dọn dẹp):", payload);

            await api.post('jobs/', payload);
            setShowModal(true);
            setTimeout(() => {
                setShowModal(false);
                navigate('/client');
            }, 3000);

        } catch (error) {
            console.error("Lỗi đăng tin:", error.response?.data || error.message);
            const errorData = error.response?.data;
            let errorDetail = "";

            if (typeof errorData === 'string') {
                errorDetail = errorData;
            } else if (errorData) {
                errorDetail = Object.entries(errorData).map(([k, v]) => {
                    const value = typeof v === 'object' ? JSON.stringify(v) : v;
                    return `${k}: ${value}`;
                }).join('\n');
            } else {
                errorDetail = error.message;
            }

            toast.error(t('postJob.postError') + errorDetail);
        } finally {
            setLoading(false);
        }
    };

    // --- 4. LOGIC AI MÔ PHỎNG ---
    const budgetThreshold = Number(t('common.budgetThreshold'));
    const potentialCandidates = Math.max(3, 22 - (skills.length * 1) + (formData.budget > budgetThreshold ? 5 : 0));
    const matchScore = Math.min(99, 65 + (skills.length * 4) + (formData.description.length > 100 ? 10 : 0));


    return (
        <div className="bg-surface text-on-surface antialiased min-h-screen font-body">
            {/* TopNavBar */}
            <ClientTopNav companyName={company?.company_name} handleLogout={handleLogout} />

            {/* KẾ THỪA SidenNavBar */}
            <ClientSidebar companyName={company?.company_name} handleLogout={handleLogout} />

            {/* Main Content Area */}
            <main className="md:ml-64 pt-24 pb-20 px-10 min-h-screen">
                <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-10">

                    {/* Left Column: Form */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-10">
                            <h1 className="text-3xl font-black tracking-tight text-on-surface">{t('postJob.title')}</h1>
                            <button className="px-6 py-2.5 rounded-full border border-outline-variant text-on-surface-variant font-semibold hover:bg-surface-container-high transition-colors">
                                {t('postJob.saveDraft')}
                            </button>
                        </div>

                        <div className="space-y-12">
                            {/* Section 1: Job Title */}
                            <section className="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-slate-100">
                                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">{t('postJob.jobTitle')}</label>
                                <input
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    className="w-full text-2xl font-bold bg-transparent border-none focus:ring-0 placeholder:text-outline-variant p-0"
                                    placeholder={t('postJob.jobTitlePlaceholder')}
                                    type="text"
                                />
                            </section>

                            {/* Section 2: Job Description */}
                            <section className="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-slate-100">
                                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">{t('postJob.jobDesc')}</label>
                                <div className="min-h-100 border border-outline-variant/30 rounded-xl flex flex-col focus-within:ring-2 ring-primary/20 transition-shadow overflow-hidden bg-white">
                                    {/* Toolbar */}
                                    <div className="flex flex-wrap items-center gap-1 p-3 bg-slate-50 border-b border-outline-variant/10">
                                        <button 
                                            type="button"
                                            onClick={() => document.execCommand('bold', false, null)}
                                            className="p-2 hover:bg-emerald-100 rounded transition-colors text-slate-600 flex items-center" title="Bold"
                                        >
                                            <span className="material-symbols-outlined">format_bold</span>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => document.execCommand('italic', false, null)}
                                            className="p-2 hover:bg-emerald-100 rounded transition-colors text-slate-600 flex items-center" title="Italic"
                                        >
                                            <span className="material-symbols-outlined">format_italic</span>
                                        </button>
                                        <div className="w-px h-6 bg-slate-300 mx-1"></div>
                                        <button 
                                            type="button"
                                            onClick={() => document.execCommand('insertUnorderedList', false, null)}
                                            className="p-2 hover:bg-emerald-100 rounded transition-colors text-slate-600 flex items-center" title="Bullet List"
                                        >
                                            <span className="material-symbols-outlined">format_list_bulleted</span>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => document.execCommand('insertOrderedList', false, null)}
                                            className="p-2 hover:bg-emerald-100 rounded transition-colors text-slate-600 flex items-center" title="Ordered List"
                                        >
                                            <span className="material-symbols-outlined">format_list_numbered</span>
                                        </button>
                                        <div className="w-px h-6 bg-slate-300 mx-1"></div>
                                        {/* Font Size Select */}
                                        <select 
                                            onChange={(e) => document.execCommand('formatBlock', false, e.target.value)}
                                            className="bg-transparent text-xs font-bold text-slate-600 border-none outline-none cursor-pointer p-2 hover:bg-emerald-100 rounded"
                                        >
                                            <option value="p">Paragraph</option>
                                            <option value="h1">Heading 1</option>
                                            <option value="h2">Heading 2</option>
                                            <option value="h3">Heading 3</option>
                                        </select>
                                        <div className="w-px h-6 bg-slate-300 mx-1"></div>
                                        <button 
                                            type="button"
                                            onClick={() => document.execCommand('justifyLeft', false, null)}
                                            className="p-2 hover:bg-emerald-100 rounded transition-colors text-slate-600 flex items-center"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">format_align_left</span>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => document.execCommand('justifyCenter', false, null)}
                                            className="p-2 hover:bg-emerald-100 rounded transition-colors text-slate-600 flex items-center"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">format_align_center</span>
                                        </button>
                                    </div>
                                    {/* Editable Area */}
                                    <div 
                                        ref={editorRef}
                                        contentEditable
                                        onInput={(e) => {
                                            const html = e.currentTarget.innerHTML;
                                            setFormData(prev => ({ ...prev, description: html }));
                                        }}
                                        className="flex-1 p-6 outline-none text-on-surface leading-relaxed min-h-75 prose prose-slate max-w-none focus:bg-white"
                                        placeholder={t('postJob.jobDescPlaceholder')}
                                        suppressContentEditableWarning={true}
                                    ></div>
                                </div>
                                <p className="mt-2 text-[10px] text-slate-400 font-medium italic">* Mẹo: Sử dụng toolbar để làm nổi bật các yêu cầu quan trọng.</p>
                            </section>

                            {/* Section 3: Required Skills */}
                            <section className="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-slate-100">
                                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">{t('postJob.requiredSkills')}</label>
                                <div className="flex flex-wrap items-center gap-2 mb-6 p-2 border border-outline-variant/30 rounded-lg focus-within:ring-2 ring-primary/20">
                                    {skills.map(skill => (
                                        <span key={skill} className="inline-flex items-center gap-1 px-4 py-1.5 bg-primary-container text-on-primary-container rounded-full text-sm font-semibold">
                                            {skill}
                                            <button onClick={() => removeSkill(skill)} className="material-symbols-outlined text-xs hover:text-red-500">close</button>
                                        </span>
                                    ))}
                                    <input
                                        value={skillInput}
                                        onChange={(e) => setSkillInput(e.target.value)}
                                        onKeyDown={handleAddSkill}
                                        className="bg-transparent border-none focus:ring-0 text-sm flex-1 min-w-37.5"
                                        placeholder={t('postJob.skillPlaceholder')}
                                        type="text"
                                    />
                                </div>
                                <div className="p-4 bg-surface-container-low rounded-xl border border-primary/10">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                                            <span className="text-xs font-bold text-primary italic uppercase tracking-wider">{t('postJob.aiSuggestCat')}</span>
                                        </div>
                                        {formData.categories.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {formData.categories.map(cat => (
                                                    <span key={cat} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded border border-emerald-200">
                                                        {cat}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {['Node.js', 'TypeScript', 'Next.js', 'Django', 'UI Design', 'Figma', 'PostgreSQL'].map(s => (
                                            <button key={s} onClick={() => addSuggestedSkill(s)} type="button" className="px-3 py-1 bg-white border border-outline-variant/20 rounded-full text-xs font-medium hover:border-primary hover:text-primary transition-colors">
                                                + {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* Section 4: Experience Level (Multi-select) */}
                            <section className="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-slate-100">
                                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">{t('postJob.expLevel')}</label>
                                <div className="flex flex-wrap gap-3">
                                    {expLevelsList.map(level => {
                                        const isSelected = formData.experience_levels.includes(level);
                                        return (
                                            <button
                                                key={level}
                                                type="button"
                                                onClick={() => toggleExpLevel(level)}
                                                className={`px-5 py-2 rounded-full text-sm font-bold border transition-all ${
                                                    isSelected 
                                                    ? 'bg-primary text-white border-primary shadow-md scale-105' 
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-primary'
                                                }`}
                                            >
                                                {level}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="mt-3 text-[10px] text-slate-400 font-medium">{t('postJob.expTip')}</p>
                            </section>

                            {/* Section 4: Project Details (New) */}
                            <section className="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-slate-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">{t('postJob.projectType')}</label>
                                        <select 
                                            name="project_type"
                                            value={formData.project_type}
                                            onChange={handleInputChange}
                                            className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="fixed">{t('postJob.fixedPrice')}</option>
                                            <option value="hourly">{t('postJob.hourly')}</option>
                                            <option value="retainer">{t('postJob.retainer')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">{t('postJob.duration')}</label>
                                        <select 
                                            name="duration"
                                            value={formData.duration}
                                            onChange={handleInputChange}
                                            className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="<1mo">{t('postJob.lessThan1Month')}</option>
                                            <option value="1-3mo">{t('postJob.oneToThreeMonths')}</option>
                                            <option value="3-6mo">{t('postJob.threeToSixMonths')}</option>
                                            <option value=">6mo">{t('postJob.overSixMonths')}</option>
                                        </select>
                                    </div>
                                </div>
                            </section>


                            {/* Section 5: Budget & Deadline */}
                            <section className="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-slate-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">{t('postJob.budget')}</label>
                                        <div className="flex items-center gap-3">
                                            <div className="relative flex-1">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-on-surface-variant">₫</span>
                                                <input
                                                    name="budget"
                                                    value={formData.budget}
                                                    onChange={handleInputChange}
                                                    className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary rounded-xl font-bold text-lg pl-10 pr-4 py-3"
                                                    type="number"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">{t('postJob.deadline')}</label>
                                        <input
                                            name="deadline"
                                            value={formData.deadline}
                                            onChange={handleInputChange}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary rounded-xl px-4 py-3 text-sm font-medium"
                                            type="date"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">{t('postJob.location')}</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">location_on</span>
                                        <input
                                            name="location"
                                            placeholder={t('postJob.locationPlaceholder')}
                                            value={formData.location}
                                            onChange={handleInputChange}
                                            className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary rounded-xl pl-12 pr-4 py-3 text-sm"
                                            type="text"
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Footer Action Bar */}
                        <div className="mt-16 flex items-center gap-4">
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 py-4 rounded-full bg-primary text-white font-black text-lg shadow-lg shadow-primary/30 hover:bg-teal-800 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                            >
                                {loading ? t('postJob.processing') : t('postJob.postNow')}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: AI Helper Sidebar */}
                    <aside className="w-full lg:w-80 hidden lg:block">
                        <div className="sticky top-24 space-y-6">
                            {/* Match Simulation */}
                            <div className="bg-on-surface text-surface rounded-lg p-6 shadow-xl relative overflow-hidden ring-4 ring-emerald-500/10">
                                <div className="relative z-10">
                                    <h3 className="text-sm font-bold opacity-80 mb-1">{t('postJob.aiMatcherSim')}</h3>
                                    <div className="flex items-end gap-2 mb-6">
                                        <span className="text-4xl font-black text-primary-fixed">{potentialCandidates}</span>
                                        <span className="text-xs font-bold mb-1 opacity-80 text-surface-variant">{t('postJob.potentialCandidates')}</span>
                                    </div>
                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider opacity-80">
                                            <span>{t('postJob.systemMatch')}</span>
                                            <span className="text-primary-fixed">{matchScore}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary-fixed transition-all duration-700 ease-out" style={{ width: `${matchScore}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex -space-x-2">
                                            <img className="w-8 h-8 rounded-full border-2 border-on-surface object-cover" alt="FL 1" src="https://i.pravatar.cc/150?u=a" />
                                            <img className="w-8 h-8 rounded-full border-2 border-on-surface object-cover" alt="FL 2" src="https://i.pravatar.cc/150?u=b" />
                                            <img className="w-8 h-8 rounded-full border-2 border-on-surface object-cover" alt="FL 3" src="https://i.pravatar.cc/150?u=c" />
                                            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-[10px] font-black border-2 border-on-surface">+{potentialCandidates - 3}</div>
                                        </div>
                                        <span className="material-symbols-outlined text-primary-fixed animate-bounce">trending_up</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Tips */}
                            <div className="p-6 bg-surface-container-lowest rounded-lg shadow-sm border border-slate-100">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-outline mb-4">{t('postJob.tips')}</h4>
                                <ul className="space-y-4">
                                    <li className="flex gap-3">
                                        <span className="material-symbols-outlined text-primary text-lg">verified</span>
                                        <p className="text-xs text-on-surface-variant leading-relaxed">
                                            {t('postJob.tipTitle', { count: 40 })}
                                        </p>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="material-symbols-outlined text-primary text-lg">bolt</span>
                                        <p className="text-xs text-on-surface-variant leading-relaxed">
                                            {t('postJob.tipBudget')}
                                        </p>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            {/* SUCCESS MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-100 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm">
                    <div className="bg-white rounded-lg p-10 max-w-sm text-center shadow-2xl animate-fade-in-up">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        </div>
                        <h2 className="text-2xl font-black text-on-surface mb-2">{t('postJob.successTitle')}</h2>
                        <p className="text-on-surface-variant text-sm mb-8 leading-relaxed">{t('postJob.successDesc')}</p>
                        <button onClick={() => navigate('/client')} className="w-full py-3 bg-primary text-white font-bold rounded-full hover:bg-teal-800 transition-colors">
                            {t('postJob.goHome')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PostJob;

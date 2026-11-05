import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { toast } from 'react-hot-toast';
import FreelancerSidebar from '../components/FreelancerSidebar';
import FreelancerTopNav from '../components/FreelancerTopNav';

const FindJobs = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [freelancerProfile, setFreelancerProfile] = useState(null);
  
  // Lấy keyword từ URL nếu có
  const queryParams = new URLSearchParams(location.search);
  const initialKeyword = queryParams.get('keyword') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialKeyword);
  const [applyingId, setApplyingId] = useState(null);
  const [filters, setFilters] = useState({
    categories: [],
    jobType: {
      fixed: false,
      hourly: false
    },
    experience_levels: [],
    minBudget: '',
    maxBudget: '',
    location: ''
  });
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [savedJobIds, setSavedJobIds] = useState([]);
  const [sortBy, setSortBy] = useState(t('findJobs.newest') || 'Mới nhất');
  const [visibleCount, setVisibleCount] = useState(5);
  const [applications, setApplications] = useState([]);
  const [appsLoaded, setAppsLoaded] = useState(false);
  const [selectedJobForApply, setSelectedJobForApply] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [coverLetter, setCoverLetter] = useState('');

  const handleLogout = (e) => {
    if (e) e.preventDefault();
    if (window.confirm(t('common.logoutConfirm') || "Bạn có chắc chắn muốn đăng xuất không?")) {
      sessionStorage.clear();
      localStorage.clear();
      navigate('/');
    }
  };

  const categoriesList = [
    { value: "Frontend Development", label: t('findJobs.categories.frontend') },
    { value: "Backend Development", label: t('findJobs.categories.backend') },
    { value: "Fullstack", label: t('findJobs.categories.fullstack') },
    { value: "Mobile (iOS/Android)", label: t('findJobs.categories.mobile') },
    { value: "DevOps / Cloud", label: t('findJobs.categories.devops') },
    { value: "Data / AI / Machine Learning", label: t('findJobs.categories.data') },
    { value: "UI/UX Design", label: t('findJobs.categories.design') }
  ];

  const expLevelsList = [
    { value: 'Intern', label: t('findJobs.expLevels.intern') },
    { value: 'Fresher', label: t('findJobs.expLevels.fresher') },
    { value: 'Junior', label: t('findJobs.expLevels.junior') },
    { value: 'Senior', label: t('findJobs.expLevels.senior') },
    { value: 'Leader', label: t('findJobs.expLevels.leader') },
    { value: 'Manager', label: t('findJobs.expLevels.manager') }
  ];

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMs = now - past;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return t('notifications.time.justNow') || 'Vừa xong';
    if (diffInMinutes < 60) return t('notifications.time.minutesAgo', { count: diffInMinutes }) || `${diffInMinutes} phút trước`;
    if (diffInHours < 24) return t('notifications.time.hoursAgo', { count: diffInHours }) || `${diffInHours} giờ trước`;
    return t('notifications.time.daysAgo', { count: diffInDays }) || `${diffInDays} ngày trước`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(t('common.locale') || 'vi-VN', { 
      style: 'currency', 
      currency: t('common.currency') || 'VND' 
    }).format(amount);
  };

  const getLevelValue = (levelStr) => {
    const levels = {
      'intern': 1,
      'fresher': 2,
      'junior': 3,
      'senior': 4,
      'leader': 5,
      'manager': 6
    };
    return levels[levelStr?.toLowerCase()] || 2;
  };

  const calculateMatchingScore = (job) => {
    if (!freelancerProfile) return 0;

    // Nếu hồ sơ có cấp bậc là "Chưa có kinh nghiệm" -> 0%
    if (freelancerProfile.experience_level === 'Chưa có kinh nghiệm') return 0;

    const jobReqs = job.requirements || [];
    let skillScore = 70;

    if (jobReqs.length > 0) {
      const mySkills = (freelancerProfile.skill_list || []).map(s => s.toLowerCase());
      let totalWeight = 0;
      let matchedWeight = 0;

      jobReqs.forEach(req => {
        const weight = req.weight || 2;
        totalWeight += weight;
        const skillName = (typeof req.skill === 'object' ? req.skill.name : req.skill).toLowerCase();
        if (mySkills.some(ms => ms.includes(skillName) || skillName.includes(ms))) {
          matchedWeight += weight;
        }
      });
      skillScore = (matchedWeight / totalWeight) * 70;
    }

    const jdLevels = (job.experience_level || 'Junior').split(',').map(l => l.trim()).filter(l => l !== "");
    const jdMinVal = jdLevels.length > 0 ? Math.min(...jdLevels.map(l => getLevelValue(l))) : 3;
    const flVal = getLevelValue(freelancerProfile.experience_level || 'Intern');

    let expScore = 0;
    const diff = jdMinVal - flVal;

    if (diff <= 0) {
      expScore = 30;
    } else if (diff === 1) {
      expScore = 15;
    } else {
      expScore = 0;
    }

    return Math.round(skillScore + expScore);
  };

  const fetchApplications = useCallback(async () => {
    try {
      const response = await api.get(`applications/?freelancer_id=${freelancerProfile.id}`);
      const apps = response.data.results || response.data;
      setApplications(apps);
      // Chỉ lưu job ID của những đơn chưa bị từ chối vào appliedJobIds để có thể ứng tuyển lại
      const activeAppJobIds = apps
        .filter(app => String(app.status).toLowerCase() !== 'rejected')
        .map(app => app.job);
      setAppliedJobIds(activeAppJobIds);
      setAppsLoaded(true);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setAppsLoaded(true); // Set true even on error to stop skeleton/loading
    }
  }, [freelancerProfile]);

  const fetchSavedJobs = useCallback(async () => {
    try {
      const response = await api.get(`saved-jobs/?freelancer_id=${freelancerProfile.id}`);
      const saved = response.data.results || response.data;
      setSavedJobIds(saved.map(s => s.job));
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
    }
  }, [freelancerProfile]);

  useEffect(() => {
    const keyword = new URLSearchParams(location.search).get('keyword');
    if (keyword !== null) {
      setSearchQuery(keyword);
    }
  }, [location.search]);

  useEffect(() => {
    fetchJobs();
    fetchProfile();
  }, []);

  useEffect(() => {
    if (freelancerProfile) {
      fetchApplications();
      fetchSavedJobs();
    }
  }, [freelancerProfile, fetchApplications, fetchSavedJobs]);

  const toggleSaveJob = async (jobId) => {
    if (!freelancerProfile) return toast.error(t('findJobs.pleaseSignIn') || "Vui lòng đăng nhập!");
    
    const isSaved = savedJobIds.includes(jobId);
    try {
      if (isSaved) {
        const response = await api.get(`saved-jobs/?freelancer_id=${freelancerProfile.id}`);
        const saved = response.data.results || response.data;
        const savedItem = saved.find(s => s.job === jobId);
        if (savedItem) {
          await api.delete(`saved-jobs/${savedItem.id}/`);
          setSavedJobIds(prev => prev.filter(id => id !== jobId));
        }
      } else {
        await api.post('saved-jobs/', {
          freelancer: freelancerProfile.id,
          job: jobId
        });
        setSavedJobIds(prev => [...prev, jobId]);
      }
    } catch (error) {
      console.error('Error toggling save job:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const userId = sessionStorage.getItem('user_id');
      const response = await api.get('freelancers/');
      const allProfiles = response.data.results || response.data;
      const myProfile = allProfiles.find(p => String(p.user) === String(userId));
      setFreelancerProfile(myProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleOpenApplyModal = (job) => {
    if (!freelancerProfile) {
      toast.error(t('findJobs.completeProfile') || "Vui lòng hoàn thiện hồ sơ để ứng tuyển!");
      return;
    }

    if (freelancerProfile.user_info && !freelancerProfile.user_info.is_email_verified) {
      toast("Tài khoản chưa xác minh! Vui lòng xác minh Email tại trang Hồ sơ để ứng tuyển công việc này.", {
        icon: '🔒',
        duration: 4000,
        style: {
          background: '#fee2e2',
          color: '#b91c1c',
          fontWeight: 'bold',
          fontSize: '16px',
          padding: '16px',
          maxWidth: '500px',
          textAlign: 'center'
        },
      });
      return;
    }

    const isActuallyApplied = appliedJobIds.includes(job.id);
    if (isActuallyApplied) {
      toast(t('findJobs.alreadyApplied') || "Bạn đã ứng tuyển công việc này rồi.", { icon: 'ℹ️' });
      return;
    }

    setSelectedJobForApply(job);
    setBidAmount(job.budget ? String(job.budget) : '');
    setCoverLetter('');
  };

  const handleConfirmApply = async (e) => {
    if (e) e.preventDefault();
    if (!selectedJobForApply) return;
    const jobId = selectedJobForApply.id;

    setApplyingId(jobId);
    try {
      const parsedBid = bidAmount ? parseFloat(bidAmount) : (selectedJobForApply.budget ? parseFloat(selectedJobForApply.budget) : null);
      const response = await api.post(`jobs/${jobId}/calculate_match/`, {
        freelancer_id: freelancerProfile.id,
        bid_amount: parsedBid,
        cover_letter: coverLetter.trim()
      });
      setAppliedJobIds(prev => [...prev, jobId]);
      await fetchApplications();
      setSelectedJobForApply(null);
      toast.success(t('findJobs.successApply', { score: response.data.matching_score }) || `Ứng tuyển thành công! Độ tương thích: ${response.data.matching_score}%`);
    } catch (error) {
      console.error('Error applying:', error);
      if (error.response?.status === 400 || error.response?.status === 409) {
        setAppliedJobIds(prev => [...prev, jobId]);
        toast(t('findJobs.alreadyApplied') || "Bạn đã ứng tuyển công việc này rồi.", { icon: 'ℹ️' });
      } else {
        toast.error(t('findJobs.failedApply') || "Ứng tuyển thất bại, vui lòng thử lại sau.");
      }
    } finally {
      setApplyingId(null);
    }
  };

  const handleCancelApply = async (jobId) => {
    if (!window.confirm(t('findJobs.cancelApplyConfirm') || "Bạn có chắc chắn muốn hủy ứng tuyển?")) return;
    
    try {
      const response = await api.get(`applications/?freelancer_id=${freelancerProfile.id}`);
      const apps = response.data.results || response.data;
      const appToCancel = apps.find(a => a.job === jobId);

      if (appToCancel) {
        await api.delete(`applications/${appToCancel.id}/`);
        setAppliedJobIds(prev => prev.filter(id => id !== jobId));
        toast.success(t('findJobs.cancelledSuccess') || "Đã hủy ứng tuyển thành công.");
      }
    } catch (error) {
      console.error('Error cancelling application:', error);
      toast.error(t('findJobs.cancelledFailed') || "Hủy ứng tuyển thất bại.");
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await api.get('jobs/');
      const jobData = response.data.results || response.data;
      setJobs(Array.isArray(jobData) ? jobData : []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = (Array.isArray(jobs) ? jobs : []).filter(job => {
    if (!job.is_active || job.status === 'In Progress' || job.status === 'Closed') return false;

    if (job.deadline) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadlineDate = new Date(job.deadline);
      if (deadlineDate < today) return false;
    }

    const sQuery = searchQuery.toLowerCase();
    const skillMatch = job.requirements?.some(req => {
      const sName = (typeof req.skill === 'object' ? req.skill.name : req.skill) || "";
      return sName.toLowerCase().includes(sQuery);
    });

    const matchesSearch = (job.title || "").toLowerCase().includes(sQuery) ||
      (job.description || "").toLowerCase().includes(sQuery) ||
      skillMatch;

    const matchesCategory = filters.categories.length === 0 ||
      filters.categories.some(cat => (job.category || "").includes(cat));

    const matchesExperience = filters.experience_levels.length === 0 ||
      filters.experience_levels.some(level => (job.experience_level || "").includes(level));

    const isFixed = (job.project_type || "").includes('Trọn gói') || (job.project_type || "").includes('Fixed');
    const isHourly = (job.project_type || "").includes('Theo giờ') || (job.project_type || "").includes('Hourly');
    const matchesType = (filters.jobType.fixed && isFixed) || (filters.jobType.hourly && isHourly) || (!filters.jobType.fixed && !filters.jobType.hourly);

    const budget = parseFloat(job.budget);
    const matchesBudget = (!filters.minBudget || budget >= parseFloat(filters.minBudget)) &&
      (!filters.maxBudget || budget <= parseFloat(filters.maxBudget));

    const matchesLocation = !filters.location ||
      (job.location || "").toLowerCase().includes(filters.location.toLowerCase());

    return matchesSearch && matchesCategory && matchesExperience && matchesType && matchesBudget && matchesLocation;
  }).sort((a, b) => {
    if (sortBy === (t('findJobs.newest') || 'Mới nhất')) {
      return new Date(b.created_at) - new Date(a.created_at);
    } else if (sortBy === (t('findJobs.highestSalary') || 'Lương cao nhất')) {
      return b.budget - a.budget;
    } else if (sortBy === (t('findJobs.highestMatch') || '% Phù hợp nhất')) {
      const scoreA = a.matching_score || calculateMatchingScore(a);
      const scoreB = b.matching_score || calculateMatchingScore(b);
      return scoreB - scoreA;
    }
    return 0;
  });

  const displayedJobs = filteredJobs.slice(0, visibleCount);

  return (
    <div className="bg-[#f8fafc] min-h-screen font-body text-slate-900 antialiased flex">
      <FreelancerSidebar profile={freelancerProfile} username={sessionStorage.getItem('username')} handleLogout={handleLogout} />
      
      <div className="flex-1 flex flex-col min-h-screen md:pl-64">
        <FreelancerTopNav profile={freelancerProfile} username={sessionStorage.getItem('username')} notifications={[]} />

        <main className="pt-24 pb-20 px-6 md:px-12 max-w-400 mx-auto flex flex-col lg:flex-row gap-10">
          {/* Left Sidebar: Filters */}
          <aside className="lg:w-64 space-y-8 sticky top-24 h-fit">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/10">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container">filter_alt</span>
                {t('findJobs.filterTitle') || 'Bộ lọc'}
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-outline mb-3 block">
                    {t('postJob.aiSuggestCat') || 'Chuyên ngành'}
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {categoriesList.map(cat => (
                      <label key={cat.value} className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary-container transition-colors">
                        <input
                          type="checkbox"
                          className="rounded text-[#006b5c] focus:ring-primary-container"
                          checked={filters.categories.includes(cat.value)}
                          onChange={(e) => {
                            const newCats = e.target.checked
                              ? [...filters.categories, cat.value]
                              : filters.categories.filter(c => c !== cat.value);
                            setFilters({ ...filters, categories: newCats });
                          }}
                        />
                        <span>{cat.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-outline mb-3 block">{t('findJobs.jobType') || 'Loại công việc'}</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded-md text-[#006b5c] focus:ring-primary-container"
                        checked={filters.jobType.fixed}
                        onChange={(e) => setFilters({ ...filters, jobType: { ...filters.jobType, fixed: e.target.checked } })}
                      />
                      <span>{t('findJobs.jobTypes.fixed') || 'Trọn gói'}</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded-md text-[#006b5c] focus:ring-primary-container"
                        checked={filters.jobType.hourly}
                        onChange={(e) => setFilters({ ...filters, jobType: { ...filters.jobType, hourly: e.target.checked } })}
                      />
                      <span>{t('findJobs.jobTypes.hourly') || 'Theo giờ'}</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-outline mb-3 block">{t('findJobs.budgetRange') || 'Ngân sách'}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder={t('findJobs.minBudget') || "Min"}
                      className="w-full bg-slate-50 border-none rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary-container"
                      value={filters.minBudget}
                      onChange={(e) => setFilters({ ...filters, minBudget: e.target.value })}
                    />
                    <input
                      type="number"
                      placeholder={t('findJobs.maxBudget') || "Max"}
                      className="w-full bg-slate-50 border-none rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary-container"
                      value={filters.maxBudget}
                      onChange={(e) => setFilters({ ...filters, maxBudget: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-outline mb-3 block">{t('profile.location') || 'Địa điểm'}</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-xs text-slate-400">location_on</span>
                    <input
                      type="text"
                      placeholder={t('findJobs.searchPlaceholder') || "Tìm địa điểm..."}
                      className="w-full bg-slate-50 border-none rounded-lg pl-8 p-2 text-xs focus:ring-1 focus:ring-primary-container"
                      value={filters.location}
                      onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-outline mb-3 block">{t('postJob.expLevel') || 'Cấp bậc'}</label>
                  <div className="space-y-2">
                    {expLevelsList.map(level => (
                      <label key={level.value} className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary-container transition-colors">
                        <input
                          type="checkbox"
                          className="rounded text-[#006b5c] focus:ring-primary-container"
                          checked={filters.experience_levels.includes(level.value)}
                          onChange={(e) => {
                            const newLevels = e.target.checked
                              ? [...filters.experience_levels, level.value]
                              : filters.experience_levels.filter(l => l !== level.value);
                            setFilters({ ...filters, experience_levels: newLevels });
                          }}
                        />
                        <span>{level.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#006b5c] p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4">
                <span className="material-symbols-outlined text-6xl">auto_awesome</span>
              </div>
              <h3 className="font-bold flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-sm">bolt</span>
                AI Matcher
              </h3>
              <p className="text-xs text-white/80 leading-relaxed mb-4">
                  {t('findJobs.matchedDesc', { count: filteredJobs.length }) || `Tìm thấy ${filteredJobs.length} công việc phù hợp với bạn!`}
              </p>
              <button
                onClick={() => setFilters({
                  categories: [],
                  jobType: { fixed: false, hourly: false },
                  experience_levels: [],
                  minBudget: '',
                  maxBudget: '',
                  location: ''
                })}
                className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-all"
              >
                {t('findJobs.resetFilters') || 'Đặt lại bộ lọc'}
              </button>
            </div>
          </aside>

          {/* Main Content: Job List */}
          <div className="flex-1 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
              <div className="flex-1 w-full">
                <h1 className="text-4xl font-black tracking-tight mb-2">{t('findJobs.title') || 'Tìm việc làm'}</h1>
                <p className="text-outline mb-6">
                  {t('findJobs.subtitle') || 'Khám phá hàng ngàn cơ hội việc làm AI & công nghệ.'}
                </p>

                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  <div className="relative w-full md:max-w-2xl">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">search</span>
                    <input
                      type="text"
                      placeholder={t('findJobs.searchPlaceholder') || "Tìm kiếm công việc..."}
                      className="w-full bg-white border-none rounded-2xl pl-12 pr-4 py-4 shadow-sm focus:ring-2 focus:ring-primary-container transition-all text-lg"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-bold text-slate-500">
                      {filteredJobs.length} {t('findJobs.jobsMatched') || 'việc làm phù hợp'}
                    </span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value={t('findJobs.newest') || 'Mới nhất'}>{t('findJobs.newest') || 'Mới nhất'}</option>
                      <option value={t('findJobs.highestSalary') || 'Lương cao nhất'}>{t('findJobs.highestSalary') || 'Lương cao nhất'}</option>
                      <option value={t('findJobs.highestMatch') || '% Phù hợp nhất'}>{t('findJobs.highestMatch') || '% Phù hợp nhất'}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center p-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006b5c]"></div>
                </div>
              ) : displayedJobs.length === 0 ? (
                <div className="bg-white p-20 rounded-3xl text-center border-2 border-dashed border-outline-variant/30">
                  <span className="material-symbols-outlined text-6xl text-outline mb-4">search_off</span>
                  <h3 className="text-xl font-bold mb-2">{t('findJobs.noJobsTitle') || 'Không tìm thấy việc làm'}</h3>
                  <p className="text-outline">{t('findJobs.noJobs') || 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'}</p>
                </div>
              ) : (
                displayedJobs.map((job) => {
                  const matchScore = job.matching_score || calculateMatchingScore(job);
                  return (
                    <div key={job.id} className="group bg-white p-8 rounded-3xl border border-outline-variant/10 hover:border-primary-container/30 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden">
                      <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl font-bold flex items-center gap-2 transition-all shadow-md text-white ${
                        matchScore >= 61 ? 'bg-emerald-500 shadow-emerald-500/20' :
                        matchScore >= 31 ? 'bg-orange-500 shadow-orange-500/20' :
                        'bg-rose-500 shadow-rose-500/20'
                      }`}>
                        <span className="material-symbols-outlined text-sm animate-pulse">auto_awesome</span>
                        {matchScore}% {t('findJobs.match') || 'Match'}
                      </div>

                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="shrink-0">
                        <div className="w-16 h-16 bg-white rounded-xl shadow-sm border border-slate-100 p-2 group-hover:border-emerald-200 transition-colors">
                          <img
                            src={job.company?.logo || "https://lh3.googleusercontent.com/a/default-user"}
                            alt="Logo"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-primary-container">{job.project_type || 'Dự án'}</span>
                          <span className="text-outline">•</span>
                          <span className="text-xs text-outline">{t('findJobs.posted') || 'Đăng'} {formatTimeAgo(job.created_at)}</span>
                        </div>
                        <h2 className="text-2xl font-bold mb-1 group-hover:text-[#006b5c] transition-colors">{job.title}</h2>
                        <h3 className="text-sm font-semibold text-slate-500 mb-3">{job.company?.company_name || 'Nhà tuyển dụng'}</h3>

                        <p className="text-on-surface-variant line-clamp-2 mb-6 leading-relaxed">
                          {job.description}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-6">
                          {job.requirements && job.requirements.length > 0 ? (
                            job.requirements.map((req, idx) => {
                              const skillLabel = typeof req.skill === 'object' ? req.skill.name : req.skill;
                              return (
                                <span key={idx} className="px-4 py-1.5 bg-[#f4fbf7] text-[#006b5c] rounded-lg text-xs font-bold border border-emerald-100/50">
                                  {skillLabel}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-xs text-slate-400 italic">{t('findJobs.noSkills') || 'Không yêu cầu kỹ năng đặc biệt'}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                            <span className="material-symbols-outlined text-sm">payments</span>
                            {formatCurrency(job.budget)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-outline">
                            <span className="material-symbols-outlined text-sm">work</span>
                            {job.duration || 'Liên hệ'}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-outline">
                            <span className="material-symbols-outlined text-sm">location_on</span>
                            {job.location || 'Từ xa'}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-rose-500 font-medium">
                            <span className="material-symbols-outlined text-sm">event</span>
                            Hạn chót: {job.deadline ? new Date(job.deadline).toLocaleDateString(t('common.locale') || 'vi-VN') : 'Không thời hạn'}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-end items-center gap-3 min-w-45">
                        <Link 
                          to={`/jobs/${job.id}`} 
                          className="w-full bg-[#e0f7f1] text-[#006b5c] py-3 rounded-full font-bold text-center hover:bg-[#c9f0e6] transition-colors shadow-sm"
                        >
                          {t('findJobs.viewDetail') || 'Xem chi tiết'}
                        </Link>
                        
                        {!appsLoaded ? (
                          <div className="w-full h-13 bg-slate-100 rounded-full animate-pulse"></div>
                        ) : (() => {
                          const application = applications.find(app => String(app.job) === String(job.id));
                          const isApplied = !!application && String(application.status).toLowerCase() !== 'rejected';
                          const isRejected = !!application && String(application.status).toLowerCase() === 'rejected';
                          const isAccepted = !!application && String(application.status).toLowerCase() === 'accepted';

                          if (isAccepted) {
                            return (
                              <button
                                disabled
                                className="w-full bg-slate-400 text-white py-3 rounded-full font-bold shadow-md flex items-center justify-center gap-2 opacity-80"
                              >
                                <span className="material-symbols-outlined text-sm">verified</span>
                                {t('jobDetail.status.accepted') || 'Đã được nhận'}
                              </button>
                            );
                          }

                          if (isApplied) {
                            return (
                              <div className="w-full flex flex-col items-center gap-2">
                                <button
                                  disabled
                                  className="w-full bg-[#f9a825] text-white py-3 rounded-full font-bold shadow-md flex items-center justify-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-sm">schedule</span>
                                  {t('findJobs.applying') || 'Đang chờ'}
                                </button>
                                <button 
                                  onClick={() => handleCancelApply(job.id)}
                                  className="text-xs font-bold text-[#d81b60] hover:underline"
                                >
                                  {t('findJobs.cancelApply') || 'Hủy ứng tuyển'}
                                </button>
                              </div>
                            );
                          }

                          return (
                            <button
                              onClick={() => handleOpenApplyModal(job)}
                              disabled={applyingId === job.id}
                              className={`w-full ${isRejected ? 'bg-orange-600' : 'bg-emerald-600'} text-white py-3 rounded-full font-bold shadow-lg transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 cursor-pointer`}
                            >
                              {applyingId === job.id 
                                ? (t('findJobs.sending') || 'Đang gửi...') 
                                : isRejected 
                                  ? (t('findJobs.reapply')) 
                                  : (t('findJobs.quickApply'))}
                            </button>
                          );
                        })()}
                      </div>

                      <button 
                        onClick={() => toggleSaveJob(job.id)}
                        className={`absolute top-14 right-5 p-2 rounded-full border transition-all hover:scale-110 active:scale-90 shadow-sm ${
                          savedJobIds.includes(job.id)
                          ? 'bg-rose-50 border-rose-200 text-rose-500'
                          : 'bg-white border-slate-100 text-slate-400 hover:text-rose-400'
                        }`}
                        title={savedJobIds.includes(job.id) ? (t('findJobs.unsave') || 'Bỏ lưu') : (t('findJobs.saveJob') || 'Lưu việc')}
                      >
                        <span className={`material-symbols-outlined text-xl ${savedJobIds.includes(job.id) ? 'fill-current' : ''}`} style={{ fontVariationSettings: savedJobIds.includes(job.id) ? "'FILL' 1" : "none" }}>
                          favorite
                        </span>
                      </button>
                    </div>
                  </div>
                  );
                })
              )}

              {filteredJobs.length > visibleCount && (
                <div className="flex justify-center pt-8">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 5)}
                    className="flex items-center gap-2 bg-white border border-emerald-600 text-emerald-600 px-8 py-3 rounded-full font-bold hover:bg-emerald-50 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined">expand_more</span>
                    {t('findJobs.loadMore')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      {/* Modal Nộp Đề Xuất Ứng Tuyển */}
      {selectedJobForApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedJobForApply(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">description</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Gửi đề xuất ứng tuyển</h3>
                <p className="text-xs text-slate-500 font-medium line-clamp-1">{selectedJobForApply.title}</p>
              </div>
            </div>

            <form onSubmit={handleConfirmApply} className="space-y-5">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Ngân sách dự án:</span>
                <span className="font-bold text-slate-800">
                  {selectedJobForApply.budget ? formatCurrency(selectedJobForApply.budget) : 'Thỏa thuận'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Mức giá bạn đề xuất (VND)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="Nhập mức giá bạn mong muốn..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    VND
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Để trống nếu bạn đồng ý với ngân sách gốc của dự án.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Thư chào hàng / Đề xuất giải pháp (Cover Letter)
                </label>
                <textarea
                  rows="5"
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Giới thiệu kinh nghiệm liên quan, giải pháp bạn sẽ thực hiện, công nghệ sử dụng và thời gian dự kiến hoàn thành..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none leading-relaxed"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedJobForApply(null)}
                  className="w-1/3 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={applyingId === selectedJobForApply.id}
                  className="w-2/3 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {applyingId === selectedJobForApply.id ? (
                    <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">send</span>
                      <span>Gửi hồ sơ ứng tuyển</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .glass-nav {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default FindJobs;

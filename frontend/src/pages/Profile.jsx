import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useTranslation } from "react-i18next";
import { useFreelancerProfile } from '../hooks/profile/useFreelancerProfile';
import { useUpdateProfile, useExtractCV, useAutofillCV, useGenerateBio, useSuggestSkills } from '../hooks/profile/useProfileMutations';

import FreelancerSidebar from "../components/FreelancerSidebar";
import FreelancerTopNav from "../components/FreelancerTopNav";
import { toast } from "react-hot-toast";

function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profileId, setProfileId] = useState(null);
  const [firstName, setFirstName] = useState("");
  // thêm khai báo email
  const [email, setEmail] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC-MhNNQulRCx2S2CK32812Y5J00-GpZ-_yFYLI8wcSFTylibabGaxA0nyg6C9pHHyWMdx2xJN_WOklnvipGC9dIJm6CB6Fq4vU_5NoTqP5xxU3eeFBUmApcd2Ghrb6zd-esszLe7_KSIzu2DfwK3G-qfSg8frPktaYEPRv2Ck6bJiExHutJnr9nx3mWRpYauqezlKBuhdthZihFhtYmi6KiVDwya8qP_JcLPlYUuR7X_tjmLVD3m4-oFH_Qsra9xYY1gH2ujld65W_",
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [cvName, setCvName] = useState(
    t("profile.noCV") || "Chưa có CV đính kèm",
  );
  const [cvFile, setCvFile] = useState(null);
  const [aiSummary, setAiSummary] = useState("");
  const [aiSkills, setAiSkills] = useState([]);
  const [experienceList, setExperienceList] = useState([]);
  const [educationList, setEducationList] = useState([]);
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState([]);
  const [experienceLevel, setExperienceLevel] = useState("Chưa có kinh nghiệm");
  const [newSkill, setNewSkill] = useState("");
  const [notifications, setNotifications] = useState([]);
  const userId = sessionStorage.getItem("user_id");

  const [profileData, setProfileData] = useState(null);
  
  // OTP States
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);

  const { data } = useFreelancerProfile(userId);
  const updateProfileMutation = useUpdateProfile(userId);
  const autofillCvMutation = useAutofillCV(userId);
  const extractCvMutation = useExtractCV(userId);
  const generateBioMutation = useGenerateBio(userId);
  const suggestSkillsMutation = useSuggestSkills(userId);
  const isExtractingCV = extractCvMutation.isPending || autofillCvMutation.isPending;
  const isGeneratingBio = generateBioMutation.isPending;
  const isGeneratingSkills = suggestSkillsMutation.isPending;
  const isSavingProfile = updateProfileMutation.isPending;

  const applyProfileData = useCallback((nextData) => {
    const myLocProfile = nextData.profile;
    setNotifications(nextData.notifications || []);

    if (myLocProfile) {
      setProfileId(myLocProfile.id);
      setFirstName(myLocProfile.first_name || myLocProfile.user_info?.first_name || "");
      setLastName(myLocProfile.last_name || myLocProfile.user_info?.last_name || "");
      setEmail(myLocProfile.email || myLocProfile.user_info?.email || "");
      setBio(myLocProfile.bio || "");
      setPortfolioUrl(myLocProfile.portfolio_url || "");
      setAiSummary(myLocProfile.ai_summary_report || "");

      if (myLocProfile.cv_url) {
        setCvName(myLocProfile.cv_url.split("/").pop() || t("profile.noCV"));
      }
      if (myLocProfile.avatar) {
        setAvatarPreview(myLocProfile.avatar);
      }

      setExperienceList(
        (myLocProfile.work_experiences || []).map((exp, index) => ({
          ...exp,
          id: exp.id || `exp-fetch-${Date.now()}-${index}`,
          title: exp.position,
          isEditing: false,
        }))
      );

      setEducationList(
        (myLocProfile.educations || []).map((edu, index) => ({
          ...edu,
          id: edu.id || `edu-fetch-${Date.now()}-${index}`,
          isEditing: false,
        }))
      );

      setProfessionalTitle(myLocProfile.professional_title || "");
      setHourlyRate(myLocProfile.hourly_rate || "");
      setLocation(myLocProfile.location || "");
      setSkills(myLocProfile.skill_list || []);
      setExperienceLevel(myLocProfile.experience_level || "Chưa có kinh nghiệm");
      setProfileData(myLocProfile);

      const draftData = sessionStorage.getItem("profile_draft_autofill");
      if (draftData) {
        try {
          const draft = JSON.parse(draftData);
          if (draft.first_name) setFirstName(draft.first_name);
          if (draft.last_name) setLastName(draft.last_name);
          if (draft.email) setEmail(draft.email);
          if (draft.professional_title) setProfessionalTitle(draft.professional_title);
          if (draft.bio) setBio(draft.bio);
          if (draft.skills && draft.skills.length > 0) setSkills(draft.skills);

          if (draft.work_experiences && Array.isArray(draft.work_experiences)) {
            setExperienceList(
              draft.work_experiences.map((exp, index) => ({
                ...exp,
                id: exp.id || `exp-draft-${Date.now()}-${index}`,
                title: exp.position || "Vị trí công việc (AI chưa trích xuất được)",
                company: exp.company || "Tên công ty / Tổ chức",
                isEditing: false,
              }))
            );
          }
          if (draft.educations && Array.isArray(draft.educations)) {
            setEducationList(
              draft.educations.map((edu, index) => ({
                ...edu,
                id: edu.id || `edu-draft-${Date.now()}-${index}`,
                school: edu.school || "Tên trường / Cơ sở đào tạo",
                degree: edu.title || edu.degree || "Bằng cấp / Chuyên ngành",
                isEditing: false,
              }))
            );
          }

          toast("Đã khôi phục bản nháp AI chưa lưu của bạn.", { icon: "📝", duration: 3000 });
        } catch (e) {
          console.error("Lỗi khi đọc bản nháp:", e);
        }
      }
    }
  }, [t]);

  useEffect(() => {
    if (!data) return;

    let isActive = true;

    Promise.resolve().then(() => {
      if (isActive) {
        applyProfileData(data);
      }
    });

    return () => {
      isActive = false;
    };
  }, [data, applyProfileData]);

    const handleSave = async () => {
    if (!profileId) return;
    
    try {
      const formattedExperiences = experienceList.map((exp) => {
        let safeDescription = exp.description;
        if (Array.isArray(safeDescription)) safeDescription = safeDescription.join("\n");
        return {
          company: exp.company,
          position: exp.title,
          duration: exp.duration,
          description: safeDescription || "",
        };
      });

      await updateProfileMutation.mutateAsync({
        profileId,
        updateData: {
          first_name: firstName,
          last_name: lastName,
          email: email,
          bio: bio,
          portfolio_url: portfolioUrl,
          work_experiences: formattedExperiences,
          educations: educationList.map((edu) => ({
            school: edu.school,
            degree: edu.title,
            duration: edu.duration,
            description: edu.description,
          })),
          professional_title: professionalTitle,
          hourly_rate: hourlyRate,
          location: location,
          skills: skills,
          experience_level: experienceLevel,
        }
      });

      if (avatarFile || cvFile) {
        const formData = new FormData();
        if (avatarFile) formData.append("avatar", avatarFile);
        if (cvFile) formData.append("cv_url", cvFile);
        
        await updateProfileMutation.mutateAsync({ profileId, updateData: formData, isFormData: true });
      }

      toast.success(t("common.success") || "Đã cập nhật thành công!");
      sessionStorage.removeItem("profile_draft_autofill");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error(t("common.error") || "Có lỗi khi lưu!");
    }
  };

  const handleSendOTP = async () => {
    if (!email || !email.trim()) {
      toast.error('Vui lòng nhập địa chỉ email hợp lệ!');
      return;
    }
    setIsSendingOTP(true);
    try {
      const res = await api.post('/accounts/send-verification-otp/', { email: email.trim().toLowerCase() });
      toast.success(res.data.message || 'Mã OTP đã được gửi đến email của bạn!');
      if (res.data?.dev_otp) {
        setOtpInput(res.data.dev_otp);
      }
      setShowOTPModal(true);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Có lỗi khi gửi OTP.');
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpInput) {
      toast.error('Vui lòng nhập mã OTP!');
      return;
    }
    setIsVerifyingOTP(true);
    try {
      const res = await api.post('/accounts/verify-email/', { 
        otp: otpInput.trim(),
        email: email.trim().toLowerCase()
      });
      toast.success(res.data.message || 'Xác thực email thành công!');
      setShowOTPModal(false);
      setOtpInput("");
      
      // Update local state to show verified tick
      if (profileData && profileData.user_info) {
        setProfileData({
          ...profileData,
          user_info: {
            ...profileData.user_info,
            email: res.data?.email || email.trim().toLowerCase(),
            is_email_verified: true
          }
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Mã OTP không hợp lệ!');
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  {
    /* Hàm trích xuất CV để autofill */
  }
  const handleAiAutofill = async () => {
    const toastId = toast.loading(t("profile.aiProcessing", "AI đang bóc tách dữ liệu CV..."));
    
    try {
      const response = await autofillCvMutation.mutateAsync({ profileId });

      if (response.status === "success") {
        const data = response.extracted_data;

        if (data.first_name) setFirstName(data.first_name);
        if (data.last_name) setLastName(data.last_name);
        if (data.email) setEmail(data.email);
        if (data.professional_title) setProfessionalTitle(data.professional_title);
        if (data.bio) setBio(data.bio);
        if (data.skills && data.skills.length > 0) setSkills(data.skills);

        if (data.work_experiences && Array.isArray(data.work_experiences)) {
          const normalizedExperiences = data.work_experiences.map((exp, index) => ({
            ...exp,
            id: `ai-exp-${Date.now()}-${index}`,
            title: exp.position || "Vị trí công việc (AI chưa trích xuất được)",
            company: exp.company || "Tên công ty / Tổ chức",
            isEditing: false,
          }));
          setExperienceList(normalizedExperiences);
        }

        if (data.educations && Array.isArray(data.educations)) {
          const normalizedEducations = data.educations.map((edu, index) => ({
            ...edu,
            id: `ai-edu-${Date.now()}-${index}`,
            school: edu.school || "Tên trường / Cơ sở đào tạo",
            degree: edu.title || edu.degree || "Bằng cấp / Chuyên ngành",
            isEditing: false,
          }));
          setEducationList(normalizedEducations);
        }

        sessionStorage.setItem("profile_draft_autofill", JSON.stringify(data));
        toast.success(t("profile.autofillSuccess", "Đã tự động điền thông tin từ CV!"), { id: toastId });
      }
    } catch (error) {
      console.error("Autofill error:", error);
      toast.error(error.response?.data?.error || "Lỗi khi tự động điền dữ liệu", { id: toastId });
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCvChange = async (e) => {
    const file = e.target.files[0];
    if (file && profileId) {
      setCvFile(file);
      setCvName(file.name);

      try {
        const formData = new FormData();
        formData.append("cv_url", file);
        
        const res = await extractCvMutation.mutateAsync({ profileId, formData });
        if (res.status === "success") {
          setAiSummary(res.ai_summary);
          toast.success(t("profile.extractSuccess") || "AI đã trích xuất thông tin từ CV thành công!");
        }
      } catch (error) {
        console.error("AI Auto-fill failed:", error);
        toast.error(t("profile.extractError") || "Tải file thất bại! Vui lòng thử lại.");
        setCvName("");
        setCvFile(null);
      }
    }
  };

  const handleAddSkill = (e) => {
    if (e.key === "Enter" && newSkill.trim()) {
      const skillToAdd = newSkill.trim();
      if (!skills.some((s) => s.toLowerCase() === skillToAdd.toLowerCase())) {
        setSkills([...skills, skillToAdd]);
      } else {
        toast(t("profile.skillExists") || "Kỹ năng này đã tồn tại.");
      }
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleGenerateBio = async () => {
    if (!profileId) return;
    try {
      const res = await generateBioMutation.mutateAsync({ profileId });
      if (res.status === "success") {
        setBio(res.bio);
      } else {
        toast.error(res.error || "Gặp lỗi khi tạo Bio.");
      }
    } catch (error) {
      console.error(error);
      toast.error(t("profile.bioGenError") || "Lỗi khi tạo Bio bằng AI.");
    }
  };

  const handleSuggestSkills = async () => {
    if (!profileId) return;
    try {
      const res = await suggestSkillsMutation.mutateAsync({ profileId });
      if (res.status === "success") {
        setAiSkills(res.skills);
      } else {
        toast.error(res.error || "Gặp lỗi khi lấy gợi ý.");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.response?.data?.error || t("profile.suggestSkillsError") || "Lỗi khi lấy gợi ý kỹ năng.");
    }
  };

  const addExperience = () => {
    setExperienceList([
      {
        id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // dùng chuỗi ngẫu nhiên để tránh tạo trùng id cho phần tử mới
        title: "",
        company: "",
        duration: "",
        description: "",
        isEditing: true,
      },
      ...experienceList,
    ]);
  };
  const updateExperience = (id, field, value) => {
    setExperienceList(
      experienceList.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp,
      ),
    );
  };
  const removeExperience = (id) => {
    setExperienceList(experienceList.filter((exp) => exp.id !== id));
  };

  const addEducation = () => {
    setEducationList([
      {
        id: `edu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // dùng chuỗi ngẫu nhiên để tránh tạo trùng id cho phần tử mới
        title: "",
        school: "",
        duration: "",
        description: "",
        isEditing: true,
      },
      ...educationList,
    ]);
  };
  const updateEducation = (id, field, value) => {
    setEducationList(
      educationList.map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu,
      ),
    );
  };
  const removeEducation = (id) => {
    setEducationList(educationList.filter((edu) => edu.id !== id));
  };

  const handleLogout = (e) => {
    if (e) e.preventDefault();
    if (
      window.confirm(
        t("common.logoutConfirm") || "Bạn có chắc chắn muốn đăng xuất không?",
      )
    ) {
      sessionStorage.clear();
      localStorage.clear();
      navigate("/");
    }
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen font-body text-slate-900 antialiased flex">
      <FreelancerSidebar
        profile={profileData}
        username={sessionStorage.getItem("username")}
        handleLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-h-screen md:pl-64">
        <FreelancerTopNav
          profile={profileData}
          username={sessionStorage.getItem("username")}
          notifications={notifications}
        />

        <main className="pt-24 pb-20 px-4 md:px-10 lg:px-20 max-w-7xl mx-auto w-full">
          <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-800 mb-2">
                {t("sidebar.profile", "Hồ sơ cá nhân")}
              </h1>
              <p className="text-slate-500 text-lg">
                {t(
                  "profile.subtitle",
                  "Cập nhật thông tin của bạn để tăng khả năng kết nối với nhà tuyển dụng bằng AI.",
                )}
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                className="text-emerald-600 font-bold hover:underline flex items-center gap-2"
                to={profileId ? `/freelancer-profile/${profileId}` : "#"}
                target="_blank"
              >
                <span className="material-symbols-outlined">visibility</span>
                {t("profile.viewPublic", "Xem hồ sơ công khai")}
              </Link>
              <button
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
                className="bg-emerald-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {updateProfileMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span className="material-symbols-outlined text-sm">
                    save
                  </span>
                )}
                {isSavingProfile
                  ? t("companyProfile.syncing") || "Đang lưu..."
                  : t("profile.save") || "Lưu hồ sơ"}
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  {/* Khu vực Avatar */}
                  <label className="relative group cursor-pointer block shrink-0">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                    <div className="w-32 h-32 rounded-full bg-slate-50 overflow-hidden border-4 border-white shadow-md">
                      <img
                        alt="User avatar"
                        className="w-full h-full object-cover"
                        src={avatarPreview}
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-white text-3xl">
                        photo_camera
                      </span>
                    </div>
                  </label>

                  {/* Form nhập liệu */}
                  <div className="flex-1 w-full space-y-6">
                    {/* Hàng họ và tên */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[0.6875rem] font-bold tracking-widest uppercase text-slate-400 px-1">
                          {t("profile.lastName", "Họ và tên đệm")}
                        </label>
                        <input
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-slate-700"
                          placeholder="VD: Nguyễn Văn"
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[0.6875rem] font-bold tracking-widest uppercase text-slate-400 px-1">
                          {t("profile.firstName", "Tên")}
                        </label>
                        <input
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-slate-700"
                          placeholder="VD: Phi"
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Hàng chuyên môn */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[0.6875rem] font-bold tracking-widest uppercase text-slate-400 px-1">
                          {t("profile.professionalTitle", "Vị trí chuyên môn")}
                        </label>
                        <input
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-slate-700"
                          placeholder="VD: UI/UX Designer"
                          type="text"
                          value={professionalTitle}
                          onChange={(e) => setProfessionalTitle(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[0.6875rem] font-bold tracking-widest uppercase text-slate-400 px-1">
                          {t("postJob.expLevel", "Cấp độ kinh nghiệm")}
                        </label>
                        <select
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-bold text-emerald-700 cursor-pointer"
                          value={experienceLevel}
                          onChange={(e) => setExperienceLevel(e.target.value)}
                        >
                          <option value="Chưa có kinh nghiệm">Chưa có kinh nghiệm</option>
                          <option value="Intern">Intern</option>
                          <option value="Fresher">Fresher</option>
                          <option value="Junior">Junior</option>
                          <option value="Senior">Senior</option>
                          <option value="Leader">Leader</option>
                          <option value="Manager">Manager</option>
                        </select>
                      </div>
                    </div>

                    {/* Hàng email */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <label className="text-[0.6875rem] font-bold tracking-widest uppercase text-slate-400">
                          {t("profile.email", "Email liên hệ")}
                        </label>
                        {profileData?.user_info?.is_email_verified ? (
                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">verified</span>
                            Đã xác thực
                          </span>
                        ) : (
                          <span className="text-[10px] text-rose-500 font-bold bg-rose-50 border border-rose-100 rounded-full px-2 py-0.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">cancel</span>
                            Chưa xác thực
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                            mail
                          </span>
                          <input
                            className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-slate-700"
                            placeholder="VD: toan.nguyen@example.com"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                        {!profileData?.user_info?.is_email_verified && (
                          <button
                            onClick={handleSendOTP}
                            disabled={isSendingOTP}
                            className="shrink-0 bg-rose-500 hover:bg-rose-600 text-white px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                          >
                            {isSendingOTP ? (
                              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                              <span className="material-symbols-outlined text-[18px]">gpp_maybe</span>
                            )}
                            Xác thực ngay
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Hàng mức lương và địa điểm */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[0.6875rem] font-bold tracking-widest uppercase text-slate-400 px-1">
                          {t("profile.hourlyRate", "Mức lương/giờ")} ($/hr)
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                            $
                          </span>
                          <input
                            className="w-full bg-slate-50 border-none rounded-xl pl-8 pr-4 py-3 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-slate-700"
                            type="number"
                            value={hourlyRate}
                            onChange={(e) => setHourlyRate(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[0.6875rem] font-bold tracking-widest uppercase text-slate-400 px-1">
                          {t("profile.location", "Địa điểm")}
                        </label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                            location_on
                          </span>
                          <input
                            list="location-options"
                            className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-slate-700"
                            placeholder={t(
                              "profile.locationPlaceholder",
                              "Chọn hoặc nhập vị trí",
                            )}
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                          />
                          <datalist id="location-options">
                            <option value="TP. Hồ Chí Minh, Việt Nam" />
                            <option value="Hà Nội, Việt Nam" />
                            <option value="Đà Nẵng, Việt Nam" />
                            <option value="Làm việc từ xa" />
                          </datalist>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                    {t("profile.bio") || "Giới thiệu bản thân"}
                  </h2>
                  <button
                    onClick={handleGenerateBio}
                    disabled={generateBioMutation.isPending}
                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                  >
                    <span
                      className={`material-symbols-outlined text-[14px] ${generateBioMutation.isPending ? "animate-spin" : ""}`}
                    >
                      {generateBioMutation.isPending ? "sync" : "auto_awesome"}
                    </span>
                    {isGeneratingBio
                      ? t("profile.aiWriting") || "AI Đang viết..."
                      : t("profile.aiWrite") || "AI Viết hỗ trợ"}
                  </button>
                </div>
                <div className="w-full bg-slate-50 rounded-xl p-4 min-h-50 border border-transparent focus-within:border-emerald-500/20 transition-all">
                  <div className="flex gap-4 border-b border-slate-200 pb-2 mb-4">
                    <span className="material-symbols-outlined cursor-pointer hover:text-emerald-600">
                      format_bold
                    </span>
                    <span className="material-symbols-outlined cursor-pointer hover:text-emerald-600">
                      format_italic
                    </span>
                    <span className="material-symbols-outlined cursor-pointer hover:text-emerald-600">
                      format_list_bulleted
                    </span>
                    <span className="material-symbols-outlined cursor-pointer hover:text-emerald-600">
                      link
                    </span>
                  </div>
                  <textarea
                    className="w-full bg-transparent border-none focus:ring-0 resize-none h-40 font-body leading-relaxed text-slate-600 outline-none"
                    placeholder={
                      t("profile.bioPlaceholder") ||
                      "Hãy kể về kinh nghiệm và giá trị của bạn..."
                    }
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  ></textarea>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                    {t("profile.experienceEducation") ||
                      "Kinh nghiệm & Học vấn"}
                  </h2>
                  <div className="flex gap-3">
                    <button
                      onClick={addEducation}
                      className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-full text-sm font-bold hover:bg-slate-200 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">
                        add
                      </span>{" "}
                      {t("profile.addEducation") || "Thêm học vấn"}
                    </button>
                    <button
                      onClick={addExperience}
                      className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-bold hover:shadow-md transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">
                        add
                      </span>{" "}
                      {t("profile.addExperience") || "Thêm kinh nghiệm"}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Experience Items */}
                  {experienceList.map((exp) => (
                    <div
                      key={exp.id}
                      className="bg-white rounded-2xl p-6 relative group border-l-4 border-emerald-600 shadow-sm border"
                    >
                      {exp.isEditing ? (
                        <div className="space-y-3">
                          <input
                            className="w-full bg-slate-50 font-bold text-lg rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20"
                            value={exp.title}
                            onChange={(e) =>
                              updateExperience(exp.id, "title", e.target.value)
                            }
                            placeholder="Vị trí (VD: Senior Developer)"
                          />
                          <input
                            className="w-full bg-slate-50 text-emerald-700 font-medium rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20"
                            value={exp.company}
                            onChange={(e) =>
                              updateExperience(
                                exp.id,
                                "company",
                                e.target.value,
                              )
                            }
                            placeholder="Công ty (VD: Tech Corp)"
                          />
                          <input
                            className="w-full bg-slate-50 text-slate-500 text-sm font-medium rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20"
                            value={exp.duration}
                            onChange={(e) =>
                              updateExperience(
                                exp.id,
                                "duration",
                                e.target.value,
                              )
                            }
                            placeholder="Thời gian (VD: 2021 - Present)"
                          />
                          <textarea
                            className="w-full bg-slate-50 text-slate-600 leading-relaxed rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none h-24"
                            value={exp.description}
                            onChange={(e) =>
                              updateExperience(
                                exp.id,
                                "description",
                                e.target.value,
                              )
                            }
                            placeholder="Mô tả công việc..."
                          ></textarea>
                          <button
                            onClick={() =>
                              updateExperience(exp.id, "isEditing", false)
                            }
                            className="bg-emerald-600 text-white px-6 py-2 rounded-full font-bold text-sm"
                          >
                            {t("common.done") || "Xong"}
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between mb-2">
                            <div>
                              <h3 className="font-bold text-lg text-slate-800">
                                {exp.title || "Chưa đặt tên"}
                              </h3>
                              <p className="text-emerald-700 font-medium">
                                {exp.company || "Chưa nhập công ty"}
                              </p>
                            </div>
                            <p className="text-slate-400 text-sm font-medium">
                              {exp.duration}
                            </p>
                          </div>
                          <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {exp.description}
                          </p>
                        </>
                      )}
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <span
                          onClick={() =>
                            updateExperience(
                              exp.id,
                              "isEditing",
                              !exp.isEditing,
                            )
                          }
                          className="material-symbols-outlined p-2 hover:bg-slate-50 text-slate-400 cursor-pointer rounded-full"
                        >
                          edit
                        </span>
                        <span
                          onClick={() => removeExperience(exp.id)}
                          className="material-symbols-outlined p-2 hover:bg-rose-50 text-rose-500 cursor-pointer rounded-full"
                        >
                          delete
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Education Items */}
                  {educationList.map((edu) => (
                    <div
                      key={edu.id}
                      className="bg-white rounded-2xl p-6 relative group border-l-4 border-teal-500 shadow-sm border"
                    >
                      {edu.isEditing ? (
                        <div className="space-y-3">
                          <input
                            className="w-full bg-slate-50 font-bold text-lg rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-teal-500/20"
                            value={edu.title}
                            onChange={(e) =>
                              updateEducation(edu.id, "title", e.target.value)
                            }
                            placeholder="Bằng cấp"
                          />
                          <input
                            className="w-full bg-slate-50 text-teal-700 font-medium rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-teal-500/20"
                            value={edu.school}
                            onChange={(e) =>
                              updateEducation(edu.id, "school", e.target.value)
                            }
                            placeholder="Trường học"
                          />
                          <input
                            className="w-full bg-slate-50 text-slate-500 text-sm font-medium rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-teal-500/20"
                            value={edu.duration}
                            onChange={(e) =>
                              updateEducation(
                                edu.id,
                                "duration",
                                e.target.value,
                              )
                            }
                            placeholder="Thời gian"
                          />
                          <textarea
                            className="w-full bg-slate-50 text-slate-600 leading-relaxed rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-teal-500/20 resize-none h-24"
                            value={edu.description}
                            onChange={(e) =>
                              updateEducation(
                                edu.id,
                                "description",
                                e.target.value,
                              )
                            }
                            placeholder="Mô tả..."
                          ></textarea>
                          <button
                            onClick={() =>
                              updateEducation(edu.id, "isEditing", false)
                            }
                            className="bg-teal-600 text-white px-6 py-2 rounded-full font-bold text-sm"
                          >
                            {t("common.done") || "Xong"}
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between mb-2">
                            <div>
                              <h3 className="font-bold text-lg text-slate-800">
                                {edu.title || "Chưa đặt tên"}
                              </h3>
                              <p className="text-teal-700 font-medium">
                                {edu.school || "Chưa nhập trường"}
                              </p>
                            </div>
                            <p className="text-slate-400 text-sm font-medium">
                              {edu.duration}
                            </p>
                          </div>
                          <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {edu.description}
                          </p>
                        </>
                      )}
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <span
                          onClick={() =>
                            updateEducation(edu.id, "isEditing", !edu.isEditing)
                          }
                          className="material-symbols-outlined p-2 hover:bg-slate-50 text-slate-400 cursor-pointer rounded-full"
                        >
                          edit
                        </span>
                        <span
                          onClick={() => removeEducation(edu.id)}
                          className="material-symbols-outlined p-2 hover:bg-rose-50 text-rose-500 cursor-pointer rounded-full"
                        >
                          delete
                        </span>
                      </div>
                    </div>
                  ))}

                  {experienceList.length === 0 &&
                    educationList.length === 0 && (
                      <p className="text-center text-sm font-medium text-slate-400 py-10 bg-white rounded-2xl border border-dashed border-slate-200">
                        {t("profile.emptyExp") ||
                          "Hãy thêm kinh nghiệm và học vấn để làm đẹp hồ sơ."}
                      </p>
                    )}
                </div>
              </section>

              {/* Saved Projects / Mini Portfolio Section */}
              <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 mt-8">
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600">folder_special</span>
                  {t("profile.savedProjects", "Dự án Mini-Portfolio đã lưu")}
                </h2>
                {profileData?.saved_projects && profileData.saved_projects.length > 0 ? (
                  <div className="space-y-6">
                    {profileData.saved_projects.map((proj, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm relative group hover:border-emerald-350 transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-base md:text-lg text-slate-850 leading-snug">
                            {proj.project_title}
                          </h3>
                          <button
                            onClick={async () => {
                              if (window.confirm("Bạn có chắc chắn muốn xóa dự án này khỏi danh sách đã lưu?")) {
                                const newSaved = profileData.saved_projects.filter((_, i) => i !== idx);
                                const updatedProfile = { ...profileData, saved_projects: newSaved };
                                setProfileData(updatedProfile);
                                try {
                                  await api.patch(`freelancers/${profileId}/`, { saved_projects: newSaved });
                                  toast.success("Đã xóa dự án thành công.");
                                } catch (err) {
                                  console.error("Lỗi xóa dự án:", err);
                                  toast.error("Không thể xóa dự án.");
                                }
                              }
                            }}
                            className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-rose-550/10 rounded-full"
                            title="Xóa dự án"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                        <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-4 whitespace-pre-wrap">
                          {proj.description}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">
                              Công nghệ sử dụng:
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {proj.tech_stack?.map((tech, i) => (
                                <span key={i} className="bg-white text-slate-655 text-[10px] font-bold px-2 py-1 rounded border border-slate-200">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">
                              Kỹ năng đạt được:
                            </h4>
                            <p className="text-xs text-slate-600 font-medium">
                              {proj.learning_outcomes}
                            </p>
                          </div>
                        </div>

                        {proj.core_features && proj.core_features.length > 0 && (
                          <div>
                            <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">
                              Các tính năng cốt lõi:
                            </h4>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {proj.core_features.map((feat, i) => (
                                <li key={i} className="text-xs text-slate-650 flex items-start gap-1.5 bg-white p-2.5 rounded-xl border border-slate-200">
                                  <span className="material-symbols-outlined text-emerald-500 text-sm mt-0.5">check_circle</span>
                                  <span className="font-semibold leading-relaxed">{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm font-medium text-slate-400 py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    {t("profile.emptyProjects", "Chưa có dự án nào được thiết kế & lưu từ Lộ Trình Học Tập.")}
                  </p>
                )}
              </section>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                <h2 className="text-lg font-extrabold text-slate-800 tracking-tight mb-6">
                  {t("profile.skills") || "Kỹ năng chuyên môn"}
                </h2>
                <div className="flex flex-wrap gap-2 mb-6">
                  {skills.map((skill, index) => (
                    <div
                      key={`${skill}-${index}`}
                      className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-100"
                    >
                      {skill}{" "}
                      <span
                        className="material-symbols-outlined text-sm cursor-pointer"
                        onClick={() => handleRemoveSkill(skill)}
                      >
                        close
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                      placeholder={
                        t("profile.skillPlaceholder") || "Nhập kỹ năng & Enter"
                      }
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={handleAddSkill}
                    />
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      add_circle
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-emerald-100">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-[0.625rem] font-black uppercase text-emerald-700 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">
                          auto_awesome
                        </span>{" "}
                        {t("profile.aiSuggest") || "AI Gợi ý"}
                      </p>
                      <button
                        onClick={handleSuggestSkills}
                        disabled={suggestSkillsMutation.isPending}
                        className="text-[0.625rem] font-bold bg-emerald-600 text-white px-3 py-1 rounded-full hover:bg-emerald-700 transition-all flex items-center gap-1 disabled:opacity-50"
                      >
                        <span
                          className={`material-symbols-outlined text-[12px] ${suggestSkillsMutation.isPending ? "animate-spin" : ""}`}
                        >
                          {suggestSkillsMutation.isPending ? "sync" : "refresh"}
                        </span>
                        {isGeneratingSkills
                          ? t("profile.extracting") || "Đang quét..."
                          : t("profile.aiSuggest") || "AI Gợi ý"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {aiSkills.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() =>
                            !skills.includes(s) && setSkills([...skills, s])
                          }
                          className="text-[10px] bg-white text-slate-600 px-2 py-1 rounded border border-slate-200 hover:border-emerald-500 transition-all"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                <h2 className="text-lg font-extrabold text-slate-800 tracking-tight mb-6">
                  {t("profile.cvFile", "Hồ sơ CV (PDF)")}
                </h2>
                <div className="bg-slate-50 rounded-2xl p-6 border border-dashed border-slate-200 text-center relative group">
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept=".pdf"
                    onChange={handleCvChange}
                  />
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-4xl text-slate-300">
                      upload_file
                    </span>
                    <p className="text-sm font-bold text-slate-800">{cvName}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
                      {t("profile.uploadCV") || "Bấm để tải lên CV mới"}
                    </p>
                  </div>
                </div>

                {/* Button autofill */}
                <div className="mt-4">
                  <button
                    onClick={handleAiAutofill}
                    disabled={extractCvMutation.isPending || autofillCvMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-linear-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:shadow-emerald-200 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isExtractingCV ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <span className="material-symbols-outlined text-[20px]">
                        psychology
                      </span>
                    )}
                    {isExtractingCV
                      ? t("profile.extracting", "Đang trích xuất...")
                      : t("profile.btnAutofill", "Tự động trích xuất CV")}
                  </button>
                  <p className="text-[9px] text-slate-400 text-center mt-2 italic px-2">
                    * AI sẽ bóc tách thông tin từ CV và điền vào các ô trống
                    phía trên. Bạn có thể kiểm tra lại trước khi lưu.
                  </p>
                </div>

                {aiSummary && (
                  <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <h4 className="text-[10px] font-black uppercase text-emerald-700 mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">
                        auto_awesome
                      </span>{" "}
                      {t("profile.aiSummary", "AI Summary (From CV)")}
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed italic line-clamp-4">
                      {aiSummary}
                    </p>
                  </div>
                )}
              </section>

              <section className="bg-[#1e293b] rounded-2xl p-8 shadow-xl text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <h3 className="text-lg font-black mb-2 relative z-10">
                  {t("profile.portfolio", "Portfolio URL")}
                </h3>
                <p className="text-slate-400 text-xs mb-6 relative z-10">
                  {t(
                    "profile.portfolioDesc",
                    "Link tới các dự án thực tế của bạn.",
                  )}
                </p>
                <div className="relative z-10">
                  <input
                    className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-white/30 font-medium"
                    placeholder="https://behance.net/username"
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                  />
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      {showOTPModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl relative animate-fadeInUp">
            <button 
              onClick={() => setShowOTPModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full p-2 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">mark_email_read</span>
              </div>
              <h3 className="text-xl font-black text-slate-800">Xác thực Email</h3>
              <p className="text-sm text-slate-500 mt-2">
                Chúng tôi vừa gửi một mã OTP gồm 6 số tới email <strong>{email}</strong>. Vui lòng kiểm tra và nhập vào bên dưới.
              </p>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                maxLength="6"
                placeholder="Nhập 6 số OTP"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full text-center text-2xl tracking-[0.5em] font-black bg-slate-50 border-2 border-slate-100 rounded-xl py-4 outline-none focus:border-emerald-500 transition-all"
              />
              <button
                onClick={handleVerifyOTP}
                disabled={isVerifyingOTP || otpInput.length !== 6}
                className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isVerifyingOTP ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span className="material-symbols-outlined">check_circle</span>
                )}
                Hoàn tất xác thực
              </button>
            </div>
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
      `}</style>
    </div>
  );
}

export default Profile;

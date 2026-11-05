import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api";
import ClientSidebar from "../components/ClientSidebar";
import PublicCompanyProfile from "./PublicCompanyProfile";
import ClientTopNav from "../components/ClientTopNav";

import { toast } from 'react-hot-toast';
function CompanyProfile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userId = sessionStorage.getItem("user_id");

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("companies/me/");
        if (response.data && response.data.id) {
          setCompany(response.data);
        }
      } catch (error) {
        if (error.response?.status === 404) {
          setCompany({
            company_name: "",
            slogan: "",
            website: "",
            phone: "",
            address: "",
            founded_year: "",
            size: "11-50",
            description: "",
            industries: [],
            facebook: "",
            linkedin: "",
            twitter: "",
            logo: "",
          });
        } else {
          console.error("Lỗi khi tải hồ sơ:", error);
        }
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchProfile();
  }, [userId]);

  const handleSave = async () => {
    //  KIỂM TRA CÁC TRƯỜNG BẮT BUỘC (BỔ SUNG)
    const requiredFields = {
      company_name: "Tên công ty",
      website: "Website",
      phone: "Số điện thoại",
      address: "Địa chỉ",
      description: "Mô tả công ty",
    };

    const missingFields = [];
    for (const [key, label] of Object.entries(requiredFields)) {
      if (!company[key] || String(company[key]).trim() === "") {
        missingFields.push(label);
      }
    }

    if (missingFields.length > 0) {
      toast(
        `Vui lòng hoàn thành các trường bắt buộc: ${missingFields.join(", ")}`,
      );
      return; // Dừng hàm, không gọi API
    }

    try {
      // Chuẩn bị dữ liệu gửi đi
      let dataToSave = { ...company };
      if (dataToSave.website && !dataToSave.website.startsWith("http")) {
        dataToSave.website = `https://${dataToSave.website}`;
      }

      const finalData = { ...dataToSave };
      delete finalData.logo;
      delete finalData.user_info;
      delete finalData.jobs;

      if (company.id) {
        await api.put(`companies/${company.id}/`, finalData);
        toast.success(t("companyProfile.saveSuccess") || "Cập nhật hồ sơ thành công!");
      } else {
        await api.post("companies/", { ...finalData, user: userId });
        toast.success(t("companyProfile.createSuccess") || "Tạo hồ sơ thành công!");
      }

      // Tải lại dữ liệu để đồng bộ
      const response = await api.get(`companies/${company.id || ""}`);
      const updatedData = response.data.results
        ? response.data.results[0]
        : response.data;
      if (updatedData) setCompany(updatedData);
    } catch (error) {
      console.error("Lỗi lưu hồ sơ:", error);
      const errorMsg = error.response?.data
        ? JSON.stringify(error.response.data)
        : t("companyProfile.saveError");
      toast.error(errorMsg);
    }
  };

  const handleLogout = (e) => {
    e.preventDefault();
    const isConfirm = window.confirm(t("common.logoutConfirm"));
    if (isConfirm) {
      sessionStorage.clear();
      navigate("/");
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast(t("companyProfile.fileTooLarge"));
      return;
    }

    const formDataLogo = new FormData();
    formDataLogo.append("logo", file);

    try {
      const response = await api.patch(
        `companies/${company.id}/`,
        formDataLogo,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      setCompany({ ...company, logo: response.data.logo });
      toast.success(t("companyProfile.uploadSuccess"));
    } catch (error) {
      console.error("Lỗi tải logo:", error);
      toast.error(t("companyProfile.uploadError"));
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-teal-700 font-bold">
        {t("companyProfile.syncing")}
      </div>
    );

  return (
    <div className="bg-surface selection:bg-primary-container selection:text-on-primary-container">
      {/* TOPNAV */}
      <ClientTopNav company={company} username={sessionStorage.getItem('username')} notifications={[]} />

      <ClientSidebar
        companyName={company.company_name}
        handleLogout={handleLogout}
      />

      <main className="md:ml-64 pt-16 min-h-screen bg-slate-50">
        <header className="sticky top-16 z-40 bg-white/80 backdrop-blur-md border-b border-surface-variant/30 px-8 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-black tracking-tight text-slate-800">
            {t("companyProfile.editTitle")}
          </h1>
          <button
            onClick={handleSave}
            className="px-8 py-3 bg-primary text-white font-bold rounded-full shadow-lg shadow-teal-900/20 hover:bg-teal-800 hover:scale-105 active:scale-95 transition-all"
          >
            {t("companyProfile.saveChanges")}
          </button>
        </header>

        <div className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-3 space-y-10">
            <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="relative group">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="w-32 h-32 rounded-full border-4 border-slate-100 overflow-hidden bg-slate-50 shadow-inner">
                    <img
                      alt="Company Logo"
                      className="w-full h-full object-cover"
                      src={
                        company.logo ||
                        "https://lh3.googleusercontent.com/aida-public/AB6AXuBVfp4gKdvfD9tmPzbvEf8_YnnBQptyt3kF-FXQSEuigAlaPC5xyQUUKWChMiW4qB9_91MrifDXpOw9Z_Z3LVlnz0bLXh3k9MaDFouPgZ-ukWfxhuoeN_BJUyAbSnadu5KXDNrXy8QjqdCdDoOcreOZQa85f9wnx7v8UCnIjog90YXsvdFM4Ps0vu92q-rRVRqQRV6ESrcvlgKMhHRCldvuTZQ_EW7w8I4IDwIobu1SFEQmhCAN96xCtsGxKrshYelZCGj5BRurV9qq"
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">
                      photo_camera
                    </span>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                      {t("companyProfile.companyName")}
                    </label>
                    <input
                      value={company.company_name}
                      onChange={(e) =>
                        setCompany({ ...company, company_name: e.target.value })
                      }
                      className="w-full bg-slate-50 border-none rounded-xl px-5 py-4 font-bold text-slate-700 focus:ring-2 focus:ring-primary/20"
                      placeholder="Tên công ty"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                      {t("companyProfile.slogan")}
                    </label>
                    <input
                      value={company.slogan}
                      onChange={(e) =>
                        setCompany({ ...company, slogan: e.target.value })
                      }
                      className="w-full bg-slate-50 border-none rounded-xl px-5 py-4 text-slate-600 focus:ring-2 focus:ring-primary/20 italic"
                      placeholder={t("companyProfile.sloganPlaceholder")}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-sm font-black uppercase tracking-widest text-primary mb-8 border-b border-primary/10 pb-4">
                {t("companyProfile.basicInfo")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                      {t("companyProfile.website")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={company.website}
                      onChange={(e) =>
                        setCompany({ ...company, website: e.target.value })
                      }
                      className="w-full bg-slate-50 border-none rounded-xl pl-5 pr-5 py-4 text-sm text-slate-600 focus:ring-2 focus:ring-primary/20"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                      {t("companyProfile.phone")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={company.phone}
                      onChange={(e) =>
                        setCompany({ ...company, phone: e.target.value })
                      }
                      className="w-full bg-slate-50 border-none rounded-xl pl-5 pr-5 py-4 text-sm text-slate-600 focus:ring-2 focus:ring-primary/20"
                      placeholder="0123 456 789"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                      {t("companyProfile.address")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={company.address}
                      onChange={(e) =>
                        setCompany({ ...company, address: e.target.value })
                      }
                      className="w-full bg-slate-50 border-none rounded-xl pl-5 pr-5 py-4 text-sm text-slate-600 focus:ring-2 focus:ring-primary/20"
                      placeholder="TP. Hồ Chí Minh, Việt Nam"
                    />
                  </div>
                </div>
                <div className="space-y-8">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                      {t("companyProfile.foundedYear")}
                    </label>
                    <input
                      value={company.founded_year}
                      onChange={(e) =>
                        setCompany({ ...company, founded_year: e.target.value })
                      }
                      className="w-full bg-slate-50 border-none rounded-xl px-5 py-4 text-sm text-slate-600 focus:ring-2 focus:ring-primary/20"
                      type="number"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                      {t("companyProfile.companySize")}
                    </label>
                    <select
                      value={company.size}
                      onChange={(e) =>
                        setCompany({ ...company, size: e.target.value })
                      }
                      className="w-full bg-slate-50 border-none rounded-xl px-5 py-4 text-sm text-slate-600 focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="1-10">
                        1-10 {t("companyProfile.employees")}
                      </option>
                      <option value="11-50">
                        11-50 {t("companyProfile.employees")}
                      </option>
                      <option value="51-200">
                        51-200 {t("companyProfile.employees")}
                      </option>
                      <option value="201+">
                        201+ {t("companyProfile.employees")}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-sm font-black uppercase tracking-widest text-primary mb-8 border-b border-primary/10 pb-4">
                {t("companyProfile.description")}
              </h2>
              <textarea
                value={company.description}
                onChange={(e) =>
                  setCompany({ ...company, description: e.target.value })
                }
                className="w-full bg-slate-50 border-none rounded-xl px-6 py-5 text-sm text-slate-600 leading-relaxed focus:ring-2 focus:ring-primary/20 min-h-62.5"
                placeholder="Giới thiệu chi tiết..."
              ></textarea>
            </section>

            <section className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-sm font-black uppercase tracking-widest text-primary mb-8 border-b border-primary/10 pb-4">
                {t("companyProfile.industries")}
              </h2>
              <div className="flex flex-wrap gap-3 mb-6">
                {(Array.isArray(company.industries)
                  ? company.industries
                  : []
                ).map((ind, idx) => (
                  <span
                    key={idx}
                    className="bg-primary/10 text-primary px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2"
                  >
                    {ind}
                    <button
                      onClick={() =>
                        setCompany({
                          ...company,
                          industries: company.industries.filter(
                            (i) => i !== ind,
                          ),
                        })
                      }
                      className="material-symbols-outlined text-[14px]"
                    >
                      close
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-4">
                <input
                  id="new-industry"
                  className="flex-1 bg-slate-50 border-none rounded-xl px-5 py-4 text-sm"
                  placeholder="Ví dụ: AI, Blockchain..."
                />
                <button
                  onClick={() => {
                    const val = document.getElementById("new-industry").value;
                    if (val) {
                      setCompany({
                        ...company,
                        industries: [...(company.industries || []), val],
                      });
                      document.getElementById("new-industry").value = "";
                    }
                  }}
                  className="px-6 py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors"
                >
                  {t("companyProfile.addIndustry")}
                </button>
              </div>
            </section>
          </div>

          <aside className="space-y-8">
            <div className="bg-white rounded-lg shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100 sticky top-44">
              <div className="bg-linear-to-r from-teal-600 to-teal-400 h-20"></div>
              <div className="px-6 pb-6 -mt-10 text-center">
                <div className="w-20 h-20 mx-auto rounded-full border-4 border-white overflow-hidden bg-white shadow-md shadow-slate-200">
                  <img
                    alt="Logo"
                    className="w-full h-full object-cover"
                    src={
                      company.logo ||
                      "https://lh3.googleusercontent.com/aida-public/AB6AXuBJRJ0K3lMdlvjEZCOW-3N4QJwqKGRGTDc3NDY9klOxc4piydxn9xDEM6PgrW4QWwweo8PklwRLFr8_H_WcDx4wSLDRCrkSS3wQrZh6M_oKaUIutaJeLBvU9IRmzpvFB429ZxYAYA7D5F-3VKtX_JKNHI3lF0F63J9j80FqYtFTOtyIKS1z6zECYlj1XlsmvXgzEfRGUpzQrL6oemgtX3rjI05kTNG5AgpQ894NUCVUWQ2FRljBlK3eOdV8YlEuOCD4wzXBCOo0Nr-r"
                    }
                  />
                </div>
                <h3 className="font-bold text-lg mt-3">
                  {company.company_name || t("companyProfile.companyName")}
                </h3>
                <p className="text-slate-500 text-sm mb-4">
                  {t("companyProfile.activeSince")}{" "}
                  {company.founded_year || "2018"}
                </p>
                <div className="flex justify-center gap-2 mb-6">
                  {(Array.isArray(company.industries) ? company.industries : [])
                    .slice(0, 2)
                    .map((i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-slate-100 text-[10px] font-bold uppercase tracking-tight rounded"
                      >
                        {i}
                      </span>
                    ))}
                </div>
                <div className="text-left space-y-3 mb-6 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">
                      location_on
                    </span>{" "}
                    {company.address || t("companyProfile.notUpdated")}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">
                      group
                    </span>{" "}
                    {company.size}
                  </div>
                </div>
                {/* Nút xem hồ sơ công khai  */}
                <button
                  onClick={() => {
                    // Kiểm tra xem công ty đã có ID chưa, nếu chưa là chưa lưu lần nào
                    if (!company.id) {
                      toast(
                        t("companyProfile.pleaseSaveFirst") ||
                          "Vui lòng lưu thông tin cơ bản trước khi xem hồ sơ công khai!",
                      );
                      return;
                    }

                    navigate(`/public-profile/${company.id}`);
                  }}
                  className="w-full py-2 bg-slate-900 text-white rounded-full text-sm font-bold hover:bg-teal-700 transition-all shadow-lg active:scale-95"
                >
                  {t("companyProfile.viewPublic")}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default CompanyProfile;

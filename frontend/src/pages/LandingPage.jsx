import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../api';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import Hls from 'hls.js';
import { ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

const LandingPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [freelancers, setFreelancers] = useState([]);

    const videoRef = useRef(null);

    const skillsToTrack = ['Java', 'Python', 'ReactJS', 'AWS', 'Android', 'NodeJS', 'C++', 'Data Eng'];

    const handleRestrictedClick = (e, path) => {
        e.preventDefault();
        const isLoggedIn = sessionStorage.getItem('access_token');
        if (!isLoggedIn) {
            toast('Vui lòng Đăng nhập để xem chi tiết!', { icon: '🔒', style: { borderRadius: '10px', background: '#333', color: '#fff' } });
            navigate('/login');
        } else {
            navigate(path);
        }
    };

    useEffect(() => {
        if (videoRef.current) {
            const video = videoRef.current;
            const videoSrc = "https://stream.mux.com/tLkHO1qZoaaQOUeVWo8hEBeGQfySP02EPS02BmnNFyXys.m3u8";
            if (Hls.isSupported()) {
                const hls = new Hls({ enableWorker: false });
                hls.loadSource(videoSrc);
                hls.attachMedia(video);
            } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
                video.src = videoSrc;
            }
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [companiesRes, freelancersRes] = await Promise.all([
                    axios.get('companies/'),
                    axios.get('freelancers/')
                ]);

                let fetchedCompanies = companiesRes.data.results || companiesRes.data;
                if (!fetchedCompanies || fetchedCompanies.length === 0) {
                    fetchedCompanies = [
                        { id: 'm1', company_name: 'VNG Corporation', logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBBBs8b6M6l7yAXpwKxMssj0CTFRBrBXn1jWXTe8aEPeE8m8zAkwFoSQsA70B1oGsqrb2Yh-jPK2uoIYzZBit6EUUKq8K4HyI6bWLr6kz4DrU3md8WQLe_O5YtvDHsv8k0Q856NWhk45edC6nX05gBXvL8nvINKis_A3N4cbbXQCi6U_OiN_T954Roc4ByqIq-XbRDmW5MnNB-H76cg2NYe8YSuh0MrwPxbxw4X-MsYB21-2J_UFM5svH8VNsc5WSnEVY3GGlQsWAkq', industries: ['Game', 'Social', 'Tech'], address: 'Ho Chi Minh', jobs: { length: 12 } },
                        { id: 'm2', company_name: 'FPT Software', logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7FHYE7z49mG4jqf60Fr5cCCYX--536tI2yFI_EMDExbH7v_wK2YVwFKEMjQo4DvIirJC_-B3PVD8Js3G_Hes_0swQY16tQdJWTq4E7df59akCwT48ik5Gn9aivZfNKMVyjF_XF-U3F5_xiZimPMI-YFXRrVo5m5FN9bybbfY7M8t0gT7e6PTk9KFdWSpn0JbbNgoRKZJ17zdGtXxsU9MQNQOop4ZaAt5tMT_LiJx1THRUcfEjlNGJDhDmXWqc0KRo9B1mx3-1DBsJ', industries: ['Cloud', 'AI', 'Outsourcing'], address: 'Ho Chi Minh', jobs: { length: 45 } },
                        { id: 'm3', company_name: 'Axon Enterprise', logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB4vLSC8sATMVZgyildOmY-V-eBurzmaxAogRAyREnTcTpwPT2JiIrrBteIgicGM7G8cDq12SEZYucwq4loxcGZ9JS4JlosbORONUlAjFAbm3c6jrH9b3E3P3Y7M90d3LmXRgvlo-XZUMh7GsTj7kIS7HXAIDQqmBdI3Zg5QyUDVbYyHbiFXooU_GX7Je2b0jhu-XChn0Ssgueuhwxi81Ip0Dl3lQNZSkqtzm-A1SUslTV7tHF8N69stD7BuV9yfDVPik5aM6-uAf2E', industries: ['Security', 'Hardware', 'IoT'], address: 'Ho Chi Minh', jobs: { length: 8 } }
                    ];
                }

                const companiesWithJobs = fetchedCompanies
                    .filter(c => (c.jobs?.length || 0) > 0)
                    .sort((a, b) => (a.jobs?.length || 0) - (b.jobs?.length || 0));

                setCompanies(companiesWithJobs.slice(0, 6));

                let fetchedFreelancers = freelancersRes.data.results || freelancersRes.data;
                if (!fetchedFreelancers || fetchedFreelancers.length === 0) {
                    fetchedFreelancers = [
                        { id: 'f1', full_name: 'Nguyen Van A', title: 'Senior Data Engineer', skill_list: ['Python', 'Spark', 'SQL'], location: 'Ho Chi Minh', level: 5 },
                        { id: 'f2', full_name: 'Tran Thi B', title: 'UI/UX Designer', skill_list: ['Figma', 'React', 'Tailwind'], location: 'Da Nang', level: 4 },
                        { id: 'f3', full_name: 'Le Van C', title: 'Fullstack Developer', skill_list: ['NodeJS', 'React', 'MongoDB'], location: 'Hanoi', level: 3 }
                    ];
                }
                setFreelancers(fetchedFreelancers.slice(0, 6));

            } catch (error) {
                console.error("Lỗi lấy dữ liệu:", error);
                setCompanies([
                    { id: 'm3', company_name: 'Axon Enterprise', logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB4vLSC8sATMVZgyildOmY-V-eBurzmaxAogRAyREnTcTpwPT2JiIrrBteIgicGM7G8cDq12SEZYucwq4loxcGZ9JS4JlosbORONUlAjFAbm3c6jrH9b3E3P3Y7M90d3LmXRgvlo-XZUMh7GsTj7kIS7HXAIDQqmBdI3Zg5QyUDVbYyHbiFXooU_GX7Je2b0jhu-XChn0Ssgueuhwxi81Ip0Dl3lQNZSkqtzm-A1SUslTV7tHF8N69stD7BuV9yfDVPik5aM6-uAf2E', industries: ['Security', 'Hardware', 'IoT'], address: 'Ho Chi Minh', jobs: { length: 8 } },
                    { id: 'm1', company_name: 'VNG Corporation', logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBBBs8b6M6l7yAXpwKxMssj0CTFRBrBXn1jWXTe8aEPeE8m8zAkwFoSQsA70B1oGsqrb2Yh-jPK2uoIYzZBit6EUUKq8K4HyI6bWLr6kz4DrU3md8WQLe_O5YtvDHsv8k0Q856NWhk45edC6nX05gBXvL8nvINKis_A3N4cbbXQCi6U_OiN_T954Roc4ByqIq-XbRDmW5MnNB-H76cg2NYe8YSuh0MrwPxbxw4X-MsYB21-2J_UFM5svH8VNsc5WSnEVY3GGlQsWAkq', industries: ['Game', 'Social', 'Tech'], address: 'Ho Chi Minh', jobs: { length: 12 } },
                    { id: 'm2', company_name: 'FPT Software', logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7FHYE7z49mG4jqf60Fr5cCCYX--536tI2yFI_EMDExbH7v_wK2YVwFKEMjQo4DvIirJC_-B3PVD8Js3G_Hes_0swQY16tQdJWTq4E7df59akCwT48ik5Gn9aivZfNKMVyjF_XF-U3F5_xiZimPMI-YFXRrVo5m5FN9bybbfY7M8t0gT7e6PTk9KFdWSpn0JbbNgoRKZJ17zdGtXxsU9MQNQOop4ZaAt5tMT_LiJx1THRUcfEjlNGJDhDmXWqc0KRo9B1mx3-1DBsJ', industries: ['Cloud', 'AI', 'Outsourcing'], address: 'Ho Chi Minh', jobs: { length: 45 } }
                ]);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="bg-[#070b0a] text-slate-300 font-sans antialiased selection:bg-[#5ed29c] selection:text-[#070b0a]">
            <style>{`
                .material-symbols-outlined {
                    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
                }
                .fill-icon {
                    font-variation-settings: 'FILL' 1;
                }
                .primary-gradient {
                    background: linear-gradient(135deg, #006b5c 0%, #00bfa5 100%);
                }
                .glass-effect {
                    backdrop-filter: blur(24px);
                }
                .search-box-shadow {
                    box-shadow: 0 12px 48px -4px rgba(0, 0, 0, 0.12), 0 4px 16px -4px rgba(0, 0, 0, 0.08);
                }
                html {
                    font-size: 18px;
                }
                @media (min-width: 768px) {
                    html {
                        font-size: 20px;
                    }
                }

                .card-bg {
                    height: 160px;
                    background-color: #fff;
                    background-image: repeating-radial-gradient(
                        circle at bottom center, 
                        #ffffff 0, 
                        #ffffff 12px, 
                        #f0f0f0 12.5px, 
                        #ffffff 13px
                    );
                }
                .card-logo {
                    position: absolute;
                    top: 100px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 130px;
                    height: 130px;
                    background-color: #fff;
                    border: 1px solid #e5e5e5;
                    border-radius: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
                    z-index: 10;
                }
                .card-logo img {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                }
                .status-dot {
                    width: 10px;
                    height: 10px;
                    background-color: #00b14f;
                    border-radius: 50%;
                    display: inline-block;
                    box-shadow: 0 0 0 4px #d4f2e3;
                }
                .lang-switcher-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 12px;
                    border-radius: 99px;
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    font-size: 14px;
                    font-weight: 700;
                    transition: all 0.2s;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .lang-switcher-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    border-color: #00bfa5;
                }
                .flag-icon {
                    width: 20px;
                    height: 14px;
                    object-fit: cover;
                    border-radius: 2px;
                }
            `}</style>

            <nav className="fixed top-0 w-full z-50 bg-slate-900/95 glass-effect border-b border-slate-800">
                <div className="flex justify-between items-center w-full px-10 py-5 max-w-360 mx-auto">
                    <div className="flex items-center space-x-12">
                        <Link to="/" className="text-3xl font-black tracking-tighter text-white">FreelanceAI</Link>
                        <div className="hidden md:flex space-x-10 text-base font-semibold">
                            <Link to="/about" className="text-slate-300 hover:text-white transition-colors">{t('nav.about')}</Link>
                            <Link to="/blog" className="text-slate-300 hover:text-white transition-colors">{t('nav.blog')}</Link>
                        </div>
                    </div>
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center">
                            <button
                                onClick={() => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}
                                className="lang-switcher-btn"
                            >
                                {i18n.language === 'vi' ? (
                                    <>
                                        <img src="https://flagcdn.com/w40/vn.png" alt="VN" className="flag-icon" />
                                        <span>VI</span>
                                    </>
                                ) : (
                                    <>
                                        <img src="https://flagcdn.com/w40/us.png" alt="EN" className="flag-icon" />
                                        <span>EN</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <Link to="/login" className="text-base font-semibold text-slate-300 hover:text-white px-6 py-3">{t('nav.signIn')}</Link>
                        <Link to="/register" className="bg-primary-container text-white px-10 py-3.5 rounded-full font-black text-base hover:bg-[#00a891] transition-all transform hover:scale-105">{t('nav.signUp')}</Link>
                    </div>
                </div>
            </nav>

            {/* 1. Background & Layout */}
            <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#070b0a] pt-32 pb-20">
                {/* HLS Video Background */}
                <video
                    ref={videoRef}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen"
                ></video>

                {/* Overlays: linear gradients */}
                <div className="absolute inset-0 bg-linear-to-r from-[#070b0a] via-[#070b0a]/80 to-transparent"></div>
                <div className="absolute inset-0 bg-linear-to-t from-[#070b0a] via-transparent to-transparent"></div>

                {/* Grid System: vertical lines */}
                <div className="absolute inset-0 w-full max-w-360 mx-auto pointer-events-none hidden md:block">
                    <div className="absolute top-0 bottom-0 left-[25%] w-px bg-white/10"></div>
                    <div className="absolute top-0 bottom-0 left-[50%] w-px bg-white/10"></div>
                    <div className="absolute top-0 bottom-0 left-[75%] w-px bg-white/10"></div>
                </div>

                {/* Central Glow */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-200 h-75 pointer-events-none mix-blend-screen">
                    <svg viewBox="0 0 800 300" className="w-full h-full opacity-40">
                        <defs>
                            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="25" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>
                        <ellipse cx="400" cy="150" rx="350" ry="80" fill="#5ed29c" filter="url(#glow)" />
                    </svg>
                </div>

                <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-10 flex flex-col items-center text-center">
                    
                    {/* 3. Hero Content & Typography */}

                    <h1 className="text-[40px] md:text-[72px] font-black text-white leading-[1.1] tracking-tighter uppercase font-['Inter'] mb-6 max-w-4xl drop-shadow-lg">
                        {t('hero.title') || 'LAUNCH YOUR IT CAREER'}
                        <span className="text-[#5ed29c]">.</span>
                    </h1>

                    <p className="text-[14px] text-white/70 font-['Inter'] max-w-lg mb-12 leading-relaxed">
                        Khám phá cơ hội sự nghiệp không giới hạn. Nền tảng kết nối nhân tài và doanh nghiệp hàng đầu thông qua sức mạnh vượt trội của Trí Tuệ Nhân Tạo.
                    </p>

                    <a href="/find-jobs" onClick={(e) => handleRestrictedClick(e, '/find-jobs')} className="inline-flex items-center gap-2 bg-[#5ed29c] text-[#070b0a] px-8 py-4 rounded-full font-bold uppercase text-[14px] font-['Inter'] hover:bg-[#4bc18a] transition-all group shadow-[0_0_30px_rgba(94,210,156,0.3)] cursor-pointer">
                        Get Started
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </a>
                </div>
            </section>

            <section className="py-32 bg-white relative">
                <div className="max-w-360 mx-auto px-10 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-20 gap-6">
                        <div>
                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight">{t('topEmployers.title')}</h2>
                            <p className="text-slate-500 mt-6 text-xl lg:text-2xl font-medium">{t('topEmployers.subtitle')}</p>
                        </div>
                        <a href="/companies" onClick={(e) => handleRestrictedClick(e, '/companies')} className="text-primary-container font-black text-xl flex items-center hover:translate-x-2 transition-transform cursor-pointer">
                            {t('topEmployers.viewAll')} <span className="material-symbols-outlined text-3xl ml-2">arrow_forward</span>
                        </a>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {companies.map((company) => (
                            <div key={company.id} onClick={(e) => handleRestrictedClick(e, `/public-profile/${company.id}`)} className="bg-white border border-slate-200 rounded-xl flex flex-col relative overflow-hidden transition-all duration-300 hover:border-primary-container/50 hover:shadow-[0_8px_30px_rgba(0,191,165,0.15)] hover:-translate-y-1 group cursor-pointer">
                                <div className="h-32 bg-linear-to-b from-slate-50 to-transparent"></div>
                                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 w-25 h-25 bg-white border border-slate-100 rounded-2xl flex items-center justify-center p-4 shadow-sm group-hover:shadow-md group-hover:border-primary-container/50 transition-all">
                                    <img src={company.logo || 'https://via.placeholder.com/150'} alt="Logo" className="max-w-full max-h-full object-contain" />
                                </div>
                                <div className="pt-20 px-6 pb-6 text-center grow flex flex-col">
                                    <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-primary-container transition-colors">{company.company_name}</h3>
                                    <div className="flex flex-wrap justify-center gap-2 mb-auto">
                                        {(company.industries || ['Tech']).slice(0, 3).map((tag, idx) => (
                                            <span key={idx} className="bg-slate-50 text-slate-600 border border-slate-100 text-[11px] font-medium px-4 py-1.5 rounded-full">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-slate-50/50 border-t border-slate-100 p-5 flex justify-between items-center">
                                    <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">{company.address || 'Viet Nam'}</span>
                                    <div className="flex items-center gap-2 text-slate-800 text-[13px] font-bold group-hover:text-primary-container transition-colors">
                                        <span className="w-2 h-2 rounded-full bg-primary-container shadow-[0_0_8px_rgba(0,191,165,0.5)]"></span> {company.jobs?.length || 0} {t('topEmployers.jobsCount')} <span className="opacity-50 ml-1">&gt;</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-32 bg-white border-t border-primary-container/20 relative">
                <div className="max-w-360 mx-auto px-10 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-20 gap-6">
                        <div>
                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight">{t('topFreelancers.title')}</h2>
                            <p className="text-slate-500 mt-6 text-xl lg:text-2xl font-medium">{t('topFreelancers.subtitle')}</p>
                        </div>
                        <Link to="/login" className="text-primary-container font-black text-xl flex items-center hover:translate-x-2 transition-transform">
                            {t('topFreelancers.viewAll')} <span className="material-symbols-outlined text-3xl ml-2">arrow_forward</span>
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {freelancers.slice(0, 6).map((fl) => (
                            <div key={fl.id} onClick={(e) => handleRestrictedClick(e, '/login')} className="bg-white border border-slate-200 rounded-xl flex flex-col relative overflow-hidden transition-all duration-300 hover:border-primary-container/50 hover:shadow-[0_8px_30px_rgba(0,191,165,0.15)] hover:-translate-y-1 group cursor-pointer">
                                <div className="h-32 bg-linear-to-b from-primary-container/5 to-transparent opacity-80"></div>
                                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-27.5 h-27.5 rounded-full overflow-hidden p-1 border border-slate-100 bg-white shadow-sm group-hover:shadow-md group-hover:border-primary-container/50 transition-all">
                                    <img src={fl.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fl.full_name)}&background=random`} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                                </div>
                                <div className="pt-20 px-6 pb-6 text-center grow flex flex-col">
                                    <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-primary-container transition-colors">{fl.full_name}</h3>
                                    <p className="text-sm font-semibold text-primary-container mb-6 tracking-wide">{fl.professional_title || fl.title || t('common.itProfessional')}</p>
                                    <div className="flex flex-wrap justify-center gap-2 mb-auto">
                                        {(fl.skill_list || ['Developer']).slice(0, 3).map((skill, idx) => (
                                            <span key={idx} className="bg-emerald-50 text-primary-container text-[11px] font-bold px-4 py-1.5 rounded-full border border-emerald-100 uppercase tracking-wider">{skill}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-slate-50 border-t border-slate-100 p-5 flex justify-between items-center">
                                    <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">{fl.location || t('common.remote')}</span>
                                    <div className="flex items-center gap-2 text-slate-800 text-[13px] font-bold group-hover:text-primary-container transition-colors">
                                        <span className="material-symbols-outlined text-primary-container text-sm fill-icon">star</span>
                                        {fl.level || 1} {t('topFreelancers.level')} <span className="opacity-50 ml-1">&gt;</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-32 bg-white border-t border-primary-container/20 relative">
                <div className="max-w-360 mx-auto px-10 relative z-10">
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-16 text-center tracking-tight">{t('skills.title')}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {skillsToTrack.map((skill) => (
                            <a key={skill} href={`/find-jobs?keyword=${skill}`} onClick={(e) => handleRestrictedClick(e, `/find-jobs?keyword=${skill}`)} className="bg-white p-8 rounded-3xl border border-slate-200 hover:border-primary-container/50 hover:bg-slate-50 hover:shadow-[0_8px_30px_rgba(0,191,165,0.1)] transition-all group flex flex-col justify-between cursor-pointer">
                                <div className="flex justify-between items-start mb-6">
                                    <span className="text-3xl font-black text-slate-900 group-hover:text-primary-container transition-colors">{skill}</span>
                                    {['Java', 'ReactJS'].includes(skill) && <span className="bg-primary-container text-white text-[10px] px-3 py-1.5 rounded-full font-black tracking-widest uppercase">{t('skills.hot')}</span>}
                                </div>
                                <div className="text-lg text-slate-400 font-semibold group-hover:text-primary-container transition-colors flex items-center gap-2">
                                    {t('topEmployers.viewAll')} <span className="material-symbols-outlined text-primary-container">trending_up</span>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            <footer className="bg-[#040605] text-slate-400 py-24 px-10 border-t-2 border-primary-container relative overflow-hidden">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-150 h-75 bg-[#5ed29c]/5 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="max-w-360 mx-auto grid grid-cols-1 md:grid-cols-4 gap-20 relative z-10">
                    <div className="space-y-8">
                        <div className="text-3xl font-black text-white tracking-tighter">FreelanceAI</div>
                        <p className="text-lg leading-relaxed max-w-sm">{t('footer.desc')}</p>
                    </div>
                    <div>
                        <h4 className="font-black text-white mb-8 uppercase text-sm tracking-[0.2em]">{t('footer.platform')}</h4>
                        <ul className="space-y-4 text-lg">
                            <li><Link className="hover:text-[#5ed29c] transition-colors" to="/about">{t('nav.about')}</Link></li>
                            <li><Link className="hover:text-[#5ed29c] transition-colors" to="/careers">{t('footer.careers')}</Link></li>
                            <li><Link className="hover:text-[#5ed29c] transition-colors" to="/press">{t('footer.press')}</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-black text-white mb-8 uppercase text-sm tracking-[0.2em]">{t('footer.legal')}</h4>
                        <ul className="space-y-4 text-lg">
                            <li><Link className="hover:text-[#5ed29c] transition-colors" to="/privacy">{t('footer.privacy')}</Link></li>
                            <li><Link className="hover:text-[#5ed29c] transition-colors" to="/terms">{t('footer.terms')}</Link></li>
                            <li><Link className="hover:text-[#5ed29c] transition-colors" to="/cookies">{t('footer.cookies')}</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-black text-white mb-8 uppercase text-sm tracking-[0.2em]">{t('footer.contact')}</h4>
                        <p className="text-lg mb-6">support@freelanceai.com</p>
                        <div className="flex space-x-6 mt-6">
                            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#5ed29c] hover:text-[#070b0a] hover:border-[#5ed29c] transition-all transform hover:scale-110 cursor-pointer shadow-lg">
                                <span className="material-symbols-outlined text-xl">alternate_email</span>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#5ed29c] hover:text-[#070b0a] hover:border-[#5ed29c] transition-all transform hover:scale-110 cursor-pointer shadow-lg">
                                <span className="material-symbols-outlined text-xl">language</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="max-w-360 mx-auto mt-20 pt-12 border-t border-white/10 text-center text-sm font-medium tracking-widest text-slate-500 uppercase relative z-10">
                    {t('footer.rights')}
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
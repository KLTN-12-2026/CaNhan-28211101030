import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import MoMoPaymentModal from '../components/MoMoPaymentModal';
import FreelancerSidebar from '../components/FreelancerSidebar';
import FreelancerTopNav from '../components/FreelancerTopNav';
import ClientSidebar from '../components/ClientSidebar';
import ClientTopNav from '../components/ClientTopNav';
import { toast } from 'react-hot-toast';

const WalletPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState('pro');
  const [isMoMoModalOpen, setIsMoMoModalOpen] = useState(false);
  const [momoPaymentData, setMomoPaymentData] = useState(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('100000');
  const [depositMethod, setDepositMethod] = useState('momo');
  const [depositLoading, setDepositLoading] = useState(false);
  const [proPaymentMethod, setProPaymentMethod] = useState('wallet'); // 'wallet' hoặc 'momo'
  const [proUpgradeLoading, setProUpgradeLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);

  const username = sessionStorage.getItem('username') || 'User';
  const userId = sessionStorage.getItem('user_id');
  const userRole = sessionStorage.getItem('user_role');

  const packages = {
    free: { 
        id: 'free', 
        name: t('wallet.free') || 'Miễn phí', 
        price: 0, 
        duration: t('wallet.forever') || 'vĩnh viễn', 
        desc: t('wallet.freeDesc') || 'Gói mặc định', 
        features: [
            t('wallet.features.profiles', { count: 6 }) || '6 Hồ sơ ứng tuyển', 
            t('wallet.features.recommendations', { count: 3 }) || '3 Đề xuất công việc', 
            t('wallet.features.cvTemplates') || 'Bản mẫu CV tiêu chuẩn'
        ] 
    },
    pro: { 
        id: 'pro', 
        name: t('wallet.pro') || 'AI Pro', 
        price: 50000, 
        duration: t('wallet.month') || 'tháng', 
        desc: t('wallet.proDesc') || 'Nâng cấp AI Pro', 
        features: [
            t('wallet.features.maxProfiles') || 'Gửi tối đa 12 hồ sơ', 
            t('wallet.features.unlimited') || 'Không giới hạn nộp đơn ứng tuyển', 
            t('wallet.features.premiumTemplates') || 'Bản mẫu CV/Cover Letter Cao cấp', 
            t('wallet.features.support') || 'Hỗ trợ 1-1 qua AI'
        ] 
    }
  };

  const handleLogout = (e) => {
    if (e) e.preventDefault();
    if (window.confirm(t('common.logoutConfirm') || "Bạn có chắc chắn muốn đăng xuất không?")) {
      sessionStorage.clear();
      localStorage.clear();
      navigate('/');
    }
  };

  const loadWalletData = useCallback(async () => {
    try {
      const res = await api.get('payments/wallet/');
      setWallet(res.data);
    } catch (err) {
      console.error('Failed to fetch wallet data', err);
    }
  }, []);

  const fetchProfileData = useCallback(async () => {
    try {
      if (userRole === 'client') {
        const res = await api.get('companies/me/').catch(async () => {
          const allRes = await api.get('companies/');
          const allCompanies = allRes.data.results || allRes.data;
          return { data: allCompanies.find(c => String(c.user) === String(userId)) };
        });
        setCompany(res.data);
      } else {
        const res = await api.get('freelancers/');
        const allProfiles = res.data.results || res.data;
        const myProfile = allProfiles.find(p => String(p.user) === String(userId));
        setProfile(myProfile);
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  }, [userId, userRole]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadWalletData(), fetchProfileData()]);
      setLoading(false);
    };
    init();
  }, [loadWalletData, fetchProfileData]);

  const handleDepositSubmit = async (e) => {
    if (e) e.preventDefault();
    const amountVal = parseFloat(depositAmount);
    if (isNaN(amountVal) || amountVal < 1000) {
      toast.error('Số tiền nạp tối thiểu là 1,000 VNĐ!');
      return;
    }

    if (depositMethod === 'momo') {
      setShowDepositModal(false);
      setMomoPaymentData({
        amount: amountVal,
        orderInfo: `Nạp tiền ví FreelanceAI (${amountVal.toLocaleString('vi-VN')} VNĐ)`,
        isProUpgrade: false
      });
      setIsMoMoModalOpen(true);
      return;
    }

    setDepositLoading(true);
    try {
      const res = await api.post('payments/deposit/', { amount: amountVal });
      toast.success(res.data?.message || `Nạp thành công ${amountVal.toLocaleString('vi-VN')} VNĐ vào ví!`);
      setShowDepositModal(false);
      await loadWalletData();
    } catch (err) {
      console.error('Deposit error:', err);
      toast.error(err.response?.data?.error || 'Nạp tiền thất bại, vui lòng thử lại.');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleUpgradeWithWallet = async () => {
    if (!wallet || Number(wallet.balance) < 50000) {
      toast.error('Số dư ví không đủ 50.000 VNĐ. Vui lòng nạp thêm tiền hoặc chọn thanh toán qua MoMo!');
      return;
    }
    setProUpgradeLoading(true);
    try {
      const res = await api.post('payments/upgrade-pro-wallet/');
      toast.success(res.data?.message || 'Đã trừ 50.000 VNĐ từ số dư ví và nâng cấp Pro thành công!');
      await Promise.all([loadWalletData(), fetchProfileData()]);
    } catch (err) {
      console.error('Upgrade Pro error:', err);
      toast.error(err.response?.data?.error || 'Nâng cấp Pro thất bại!');
    } finally {
      setProUpgradeLoading(false);
    }
  };

  const quickAmounts = [50000, 100000, 200000, 500000, 1000000];

  const formatVND = (val) => {
    const num = Number(val || 0);
    return `${num.toLocaleString('vi-VN')} VNĐ`;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8fafb] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-teal-500/20 border-t-teal-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans antialiased text-[#1e293b] flex">
      {userRole === 'client' ? (
        <ClientSidebar companyName={company?.company_name} handleLogout={handleLogout} />
      ) : (
        <FreelancerSidebar profile={profile} username={username} handleLogout={handleLogout} />
      )}
      
      <div className="flex-1 flex flex-col min-h-screen md:pl-64">
        {userRole === 'client' ? (
            <ClientTopNav company={company} username={username} notifications={[]} />
        ) : (
            <FreelancerTopNav profile={profile} username={username} notifications={[]} />
        )}

        <div className="bg-white py-4 px-6 md:px-12 border-b border-slate-100 pt-24">
            <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs font-medium text-slate-400">
                <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                <span>{t('wallet.headerPath') || 'Tài chính'}</span>
                <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                <span className="text-slate-900 font-bold">Ví điện tử & Ký quỹ Escrow</span>
            </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 w-full space-y-10">
            {/* THẺ SỐ DƯ & QUẢN LÝ VÍ */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Ví điện tử & Ký quỹ Escrow</h1>
                  <p className="text-sm text-slate-500">Quản lý dòng tiền, số dư tạm giữ bảo vệ hợp đồng và nâng cấp tài khoản</p>
                </div>
                <button
                  onClick={() => setShowDepositModal(true)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer self-start sm:self-auto"
                >
                  <span className="material-symbols-outlined text-lg">add_card</span>
                  <span>Nạp tiền vào ví</span>
                </button>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Số dư khả dụng */}
                <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-3xl p-6 text-white shadow-xl shadow-emerald-900/10 relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Số dư khả dụng</span>
                    <span className="p-2 bg-white/10 rounded-xl backdrop-blur-md material-symbols-outlined text-emerald-200">
                      payments
                    </span>
                  </div>
                  <div className="text-3xl font-black tracking-tight mb-2 relative z-10">
                    {formatVND(wallet?.balance)}
                  </div>
                  <p className="text-xs text-emerald-100/80 relative z-10">
                    Dùng để thanh toán dịch vụ, tạo hợp đồng hoặc rút tiền
                  </p>
                </div>

                {/* Số dư ký quỹ Escrow */}
                <div className="bg-gradient-to-br from-amber-500 to-orange-700 rounded-3xl p-6 text-white shadow-xl shadow-amber-900/10 relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-200">Ký quỹ tạm giữ (Escrow)</span>
                    <span className="p-2 bg-white/10 rounded-xl backdrop-blur-md material-symbols-outlined text-amber-200">
                      lock
                    </span>
                  </div>
                  <div className="text-3xl font-black tracking-tight mb-2 relative z-10">
                    {formatVND(wallet?.escrow_balance)}
                  </div>
                  <p className="text-xs text-amber-100/80 relative z-10">
                    Tiền được bảo vệ bởi Escrow và sẽ giải ngân khi duyệt sản phẩm
                  </p>
                </div>

                {/* AI Credits */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-800 rounded-3xl p-6 text-white shadow-xl shadow-indigo-900/10 relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Điểm AI Credits</span>
                    <span className="p-2 bg-white/10 rounded-xl backdrop-blur-md material-symbols-outlined text-indigo-200">
                      auto_awesome
                    </span>
                  </div>
                  <div className="text-3xl font-black tracking-tight mb-2 relative z-10">
                    {wallet?.ai_credits || 0} <span className="text-sm font-semibold text-indigo-200">điểm</span>
                  </div>
                  <p className="text-xs text-indigo-100/80 relative z-10">
                    Dùng cho Smart CV Extraction, AI Matching & Bio Generator
                  </p>
                </div>
              </div>
            </div>

            {/* LỊCH SỬ GIAO DỊCH GẦN ĐÂY */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                    <span className="material-symbols-outlined">history</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Lịch sử giao dịch gần đây</h2>
                    <p className="text-xs text-slate-500">Các hoạt động nạp tiền, giữ tiền Escrow và thanh toán</p>
                  </div>
                </div>
                <button
                  onClick={loadWalletData}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  <span>Làm mới</span>
                </button>
              </div>

              {wallet?.recent_transactions && wallet.recent_transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Mã GD</th>
                        <th className="py-3 px-4">Loại GD</th>
                        <th className="py-3 px-4">Mô tả</th>
                        <th className="py-3 px-4">Số tiền</th>
                        <th className="py-3 px-4">Trạng thái</th>
                        <th className="py-3 px-4 text-right">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {wallet.recent_transactions.map((tx) => {
                        const isDeposit = tx.transaction_type === 'DEPOSIT' || tx.transaction_type === 'RELEASE';
                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-medium text-slate-600">
                              #{String(tx.id).padStart(6, '0')}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-800">
                              {tx.transaction_type === 'DEPOSIT' && 'Nạp tiền'}
                              {tx.transaction_type === 'WITHDRAWAL' && 'Rút tiền'}
                              {tx.transaction_type === 'ESCROW_HOLD' && 'Tạm giữ Escrow'}
                              {tx.transaction_type === 'RELEASE' && 'Giải ngân Escrow'}
                              {tx.transaction_type === 'REFUND' && 'Hoàn trả Escrow'}
                              {!['DEPOSIT', 'WITHDRAWAL', 'ESCROW_HOLD', 'RELEASE', 'REFUND'].includes(tx.transaction_type) && tx.transaction_type}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                              {tx.description || '-'}
                            </td>
                            <td className={`py-3.5 px-4 font-black ${isDeposit ? 'text-emerald-600' : 'text-slate-900'}`}>
                              {isDeposit ? '+' : '-'}{formatVND(tx.amount)}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                {tx.status === 'COMPLETED' ? 'Hoàn tất' : tx.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-400 font-medium">
                              {tx.created_at ? new Date(tx.created_at).toLocaleString('vi-VN') : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">receipt_long</span>
                  <p className="text-sm font-medium">Chưa có giao dịch nào được ghi nhận</p>
                </div>
              )}
            </div>

            {/* PHẦN NÂNG CẤP GÓI FREELANCEAI PRO */}
            <div className="pt-4">
              <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Nâng cấp tài khoản FreelanceAI Pro</h2>
              <p className="text-sm text-slate-500 mb-8">Mở khóa tính năng đề xuất công việc không giới hạn và hỗ trợ AI chuyên sâu</p>

              <div className="grid lg:grid-cols-12 gap-10 items-start">
                  <div className="lg:col-span-8 space-y-12">
                      <section>
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="text-lg font-black text-slate-800">{t('wallet.step1') || 'Bước 1: Chọn gói nâng cấp'}</h3>
                              <button className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded uppercase tracking-tighter hover:bg-slate-200 transition-colors">{t('wallet.giftCode') || 'Mã quà tặng'}</button>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                              <div 
                                  onClick={() => setSelectedPackage('free')}
                                  className={`bg-white rounded-2xl p-8 border-2 cursor-pointer transition-all ${selectedPackage === 'free' ? 'border-teal-600 shadow-xl' : 'border-slate-100 hover:border-slate-200'}`}
                              >
                                  <div className="flex justify-between items-center mb-6">
                                      <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center font-bold text-slate-300">1</div>
                                          <h4 className="text-xl font-black text-slate-800">{t('wallet.free') || 'Miễn phí'}</h4>
                                      </div>
                                      <span className="text-slate-400 font-bold text-sm">{t('wallet.free') || 'Miễn phí'}</span>
                                  </div>
                                  <div className="h-px bg-slate-50 mb-6"></div>
                                  <ul className="space-y-4 mb-8">
                                      {packages.free.features.map((f, i) => (
                                          <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-600">
                                              <span className="material-symbols-outlined text-slate-300 text-lg">description</span>
                                              {f}
                                          </li>
                                      ))}
                                  </ul>
                                  <button className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${selectedPackage === 'free' ? 'bg-teal-700 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{t('wallet.usePackage') || 'Sử dụng'}</button>
                              </div>

                              <div 
                                  onClick={() => setSelectedPackage('pro')}
                                  className={`bg-[#1e293b] rounded-2xl p-8 border-2 cursor-pointer transition-all relative overflow-hidden ${selectedPackage === 'pro' ? 'border-teal-500 shadow-2xl scale-[1.02]' : 'border-transparent opacity-80'}`}
                              >
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                  <div className="flex justify-between items-center mb-6 relative z-10">
                                      <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#1e293b]">
                                              <span className="material-symbols-outlined text-lg">check</span>
                                          </div>
                                          <h4 className="text-xl font-black text-white">{t('wallet.pro') || 'AI Pro'}</h4>
                                      </div>
                                      <div className="text-right">
                                          <span className="text-white font-black text-lg">50,000 VNĐ</span>
                                          <span className="text-slate-400 text-[10px] block font-bold uppercase">/ {t('wallet.month') || 'tháng'}</span>
                                      </div>
                                  </div>
                                  <div className="h-px bg-white/10 mb-6 relative z-10"></div>
                                  <ul className="space-y-4 mb-8 relative z-10">
                                      {packages.pro.features.map((f, i) => (
                                          <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-300">
                                              <span className="material-symbols-outlined text-teal-400 text-lg">check_circle</span>
                                              {f}
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                          </div>
                      </section>

                      <section>
                          <h3 className="text-lg font-black text-slate-800 mb-6">{t('wallet.step2') || 'Bước 2: Chọn hình thức thanh toán'}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Phương thức 1: Số dư ví nội bộ (Trừ trực tiếp từ balance) */}
                              <div 
                                  className={`bg-white rounded-2xl border-2 overflow-hidden transition-all p-6 flex flex-col items-center justify-center cursor-pointer ${
                                    proPaymentMethod === 'wallet' && selectedPackage === 'pro'
                                      ? 'border-emerald-600 shadow-xl shadow-emerald-600/10 scale-[1.02]' 
                                      : 'border-slate-100 hover:border-slate-200'
                                  }`}
                                  onClick={() => setProPaymentMethod('wallet')}
                              >
                                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 shadow-md shadow-emerald-600/10">
                                      <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
                                  </div>
                                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider text-center">Số dư ví</span>
                                  <span className="text-[11px] font-bold text-emerald-600 mt-1">
                                    {formatVND(wallet?.balance)}
                                  </span>
                                  <span className={`text-[9px] font-bold mt-1.5 px-2.5 py-0.5 rounded-full ${Number(wallet?.balance || 0) >= 50000 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {Number(wallet?.balance || 0) >= 50000 ? 'Đủ điều kiện trừ ví' : 'Không đủ số dư'}
                                  </span>
                              </div>

                              {/* Phương thức 2: Ví MoMo Sandbox */}
                              <div 
                                  className={`bg-white rounded-2xl border-2 overflow-hidden transition-all p-6 flex flex-col items-center justify-center cursor-pointer ${
                                    proPaymentMethod === 'momo' && selectedPackage === 'pro'
                                      ? 'border-pink-500 shadow-xl shadow-pink-500/10 scale-[1.02]' 
                                      : 'border-slate-100 hover:border-slate-200'
                                  }`}
                                  onClick={() => setProPaymentMethod('momo')}
                              >
                                  <div className="w-12 h-12 bg-pink-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-pink-500/20">
                                      <img src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png" alt="MoMo" className="w-8 h-8 brightness-0 invert" />
                                  </div>
                                  <span className="text-xs font-black text-pink-600 uppercase tracking-widest text-center">{t('wallet.momoTitle') || 'Ví MoMo'}</span>
                                  <span className="text-[10px] text-pink-600 font-bold mt-1 bg-pink-50 px-2.5 py-0.5 rounded-full">MoMo Sandbox</span>
                                  <span className="text-[9px] text-slate-400 font-medium mt-1">Quét mã QR MoMo</span>
                              </div>

                              {/* Phương thức 3: Thẻ quốc tế (Sắp hỗ trợ) */}
                              <div className="bg-slate-50 rounded-2xl border-2 border-slate-100 p-6 flex flex-col items-center justify-center text-center opacity-50 grayscale cursor-not-allowed">
                                  <span className="material-symbols-outlined text-4xl text-slate-400 mb-3">credit_card</span>
                                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{t('wallet.cardTitle') || 'Thẻ quốc tế'}</p>
                                  <span className="text-[10px] text-slate-400 font-medium mt-1">Sắp hỗ trợ</span>
                              </div>
                          </div>
                      </section>

                      <div className="mt-10 flex gap-3 text-[10px] text-slate-400 leading-relaxed italic">
                          <span className="material-symbols-outlined text-xs text-red-500">call</span>
                          <p>
                              {t('wallet.supportContact') || 'Hỗ trợ:'}
                              <span className="text-teal-600 font-bold mx-1">support@freelanceai.vn</span> 
                              hoặc hotline: <span className="text-slate-700 font-bold">(024) 6680 5588</span> (Giờ hành chính)
                          </p>
                      </div>
                  </div>

                  <div className="lg:col-span-4 space-y-6">
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <img 
                                  src={profile?.avatar || `https://ui-avatars.com/api/?name=${username}&background=006B5C&color=fff&size=64`} 
                                  className="w-12 h-12 rounded-full border-2 border-slate-50 shadow-sm object-cover" 
                                  alt="Avatar" 
                              />
                              <div>
                                  <h4 className="text-sm font-black text-slate-800">{username}</h4>
                                  <div className="flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[10px] text-blue-500">verified</span>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">{t('wallet.verifiedAccount') || 'Đã xác thực'}</span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                          <h3 className="text-lg font-black text-slate-800 mb-8 tracking-tight">{t('wallet.invoiceTitle') || 'Hóa đơn'}</h3>
                          <div className="space-y-6">
                              <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 font-medium">{t('wallet.packageName') || 'Gói'}:</span>
                                  <span className="font-black text-slate-800 uppercase tracking-tight">{packages[selectedPackage].name}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 font-medium">{t('wallet.duration') || 'Thời hạn'}:</span>
                                  <span className="font-black text-slate-800">1 {packages[selectedPackage].duration}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 font-medium">{t('wallet.total') || 'Tổng tiền'}:</span>
                                  <span className="font-black text-slate-800">{packages[selectedPackage].price.toLocaleString('vi-VN')} VNĐ</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 font-medium">{t('wallet.tax') || 'Thuế/Phí'}:</span>
                                  <span className="font-black text-slate-800">0 VNĐ</span>
                              </div>
                          </div>
                          
                          <div className="h-px bg-slate-100 my-8"></div>

                          <button 
                              onClick={() => {
                                if (selectedPackage === 'free') return;
                                if (proPaymentMethod === 'wallet') {
                                  handleUpgradeWithWallet();
                                } else {
                                  setMomoPaymentData({
                                    amount: packages[selectedPackage].price,
                                    orderInfo: `Nâng cấp ${packages[selectedPackage].name}`,
                                    paymentType: 'PRO_UPGRADE',
                                    isProUpgrade: true
                                  });
                                  setIsMoMoModalOpen(true);
                                }
                              }}
                              disabled={selectedPackage === 'free' || proUpgradeLoading}
                              className={`w-full py-4 rounded-full font-black text-sm shadow-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${
                                selectedPackage === 'free' 
                                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                                  : proPaymentMethod === 'wallet'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/10'
                                    : 'bg-pink-600 hover:bg-pink-700 text-white shadow-pink-600/20'
                              }`}
                          >
                              {proUpgradeLoading ? (
                                <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                              ) : selectedPackage === 'free' ? (
                                'Đang dùng gói Miễn phí'
                              ) : proPaymentMethod === 'wallet' ? (
                                'Thanh toán bằng Số dư ví (Trừ 50.000 VNĐ)'
                              ) : (
                                'Thanh toán qua Ví MoMo (50.000 VNĐ)'
                              )}
                          </button>
                      </div>
                  </div>
              </div>
            </div>
        </div>

        {/* MODAL NẠP TIỀN */}
        {showDepositModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
              <button
                onClick={() => setShowDepositModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>

              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">add_card</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Nạp tiền vào ví</h3>
                  <p className="text-xs text-slate-500">Bổ sung số dư phục vụ giao dịch và ký quỹ</p>
                </div>
              </div>

              <form onSubmit={handleDepositSubmit} className="space-y-5">
                {/* Chọn phương thức nạp */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Phương thức thanh toán
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDepositMethod('momo')}
                      className={`p-3 rounded-2xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer ${
                        depositMethod === 'momo'
                          ? 'border-pink-500 bg-pink-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <img src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png" alt="MoMo" className="w-6 h-6 rounded-md" />
                        <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${depositMethod === 'momo' ? 'border-pink-600 bg-pink-600' : 'border-slate-300'}`}>
                          {depositMethod === 'momo' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-800">Ví MoMo</span>
                      <span className="text-[10px] text-pink-600 font-semibold">Cổng Sandbox / QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDepositMethod('direct')}
                      className={`p-3 rounded-2xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer ${
                        depositMethod === 'direct'
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="material-symbols-outlined text-emerald-600 text-xl">bolt</span>
                        <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${depositMethod === 'direct' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'}`}>
                          {depositMethod === 'direct' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-800">Nạp nhanh</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">Mô phỏng tức thì</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Chọn số tiền nhanh
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDepositAmount(String(amt))}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          depositAmount === String(amt)
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {(amt / 1000).toLocaleString('vi-VN')}k VNĐ
                      </button>
                    ))}
                  </div>

                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Hoặc nhập số tiền tùy chọn (VNĐ)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="VD: 500000"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      VNĐ
                    </span>
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDepositModal(false)}
                    className="w-1/3 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={depositLoading}
                    className={`w-2/3 py-3 rounded-xl font-bold text-sm shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer ${
                      depositMethod === 'momo'
                        ? 'bg-pink-600 hover:bg-pink-700 text-white shadow-pink-600/20'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    }`}
                  >
                    {depositLoading ? (
                      <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">
                          {depositMethod === 'momo' ? 'qr_code_scanner' : 'check'}
                        </span>
                        <span>{depositMethod === 'momo' ? 'Tiếp tục với MoMo' : 'Xác nhận nạp tiền'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MOMO MODAL */}
        {isMoMoModalOpen && momoPaymentData && (
            <MoMoPaymentModal
                amount={momoPaymentData.amount}
                orderInfo={momoPaymentData.orderInfo}
                paymentType={momoPaymentData.paymentType || 'DEPOSIT'}
                onClose={() => {
                  setIsMoMoModalOpen(false);
                  setMomoPaymentData(null);
                }}
                onSuccess={() => {
                    toast.success(
                      momoPaymentData.isProUpgrade 
                        ? (t('wallet.successMessage') || 'Nâng cấp tài khoản thành công!')
                        : 'Nạp tiền vào ví thành công!'
                    );
                    setIsMoMoModalOpen(false);
                    setMomoPaymentData(null);
                    loadWalletData();
                    fetchProfileData();
                }}
            />
        )}
      </div>
    </div>
  );
};

export default WalletPage;

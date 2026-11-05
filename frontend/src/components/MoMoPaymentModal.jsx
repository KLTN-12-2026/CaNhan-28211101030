import React, { useState, useEffect, useRef } from 'react';
import axios from '../api';
import { toast } from 'react-hot-toast';

const MoMoPaymentModal = ({ amount, orderInfo, paymentType = 'DEPOSIT', onClose, onSuccess }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [payUrl, setPayUrl] = useState('');
  const [deeplink, setDeeplink] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 phút
  const hasInitializedRef = useRef(false);

  const initPayment = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await axios.post('/payments/momo-create/', {
        amount,
        order_info: orderInfo || 'Nạp tiền vào ví FreelanceAI',
        payment_type: paymentType
      });
      
      setOrderId(data.orderId);
      setPayUrl(data.payUrl || '');
      setDeeplink(data.deeplink || '');
      // MoMo trả về qrCodeUrl hoặc payUrl
      setQrCodeUrl(data.qrCodeUrl || data.payUrl || `MOCK_QR_${data.orderId}`);
    } catch (err) {
      console.error('MoMo Init Error', err);
      setError(err.response?.data?.error || 'Không thể khởi tạo thanh toán MoMo. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    if (amount) {
      initPayment();
    }
  }, [amount, orderInfo]);

  // Đếm ngược thời gian hết hạn mã thanh toán
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Polling tự động kiểm tra trạng thái thanh toán từ MoMo API mỗi 3 giây
  useEffect(() => {
    if (!orderId || timeLeft <= 0) return;
    
    const checkStatus = setInterval(async () => {
      try {
        const { data } = await axios.get(`/payments/momo-check-status/?order_id=${encodeURIComponent(orderId)}`);
        if (data.status === 'COMPLETED') {
          toast.success(data.message || 'Thanh toán MoMo thành công!');
          clearInterval(checkStatus);
          onSuccess(data);
        }
      } catch (err) {
        // im lặng bỏ qua lỗi mạng tạm thời trong lúc polling
        console.debug('Polling check status:', err);
      }
    }, 3000);

    return () => clearInterval(checkStatus);
  }, [orderId, timeLeft, onSuccess]);

  const handleSimulateSuccess = async () => {
    try {
      const res = await axios.post('/payments/mock-payment-success/', {
        orderId: orderId,
        amount: amount
      });
      toast.success(res.data?.message || 'Giả lập thanh toán MoMo thành công!');
      onSuccess(res.data);
    } catch (err) {
      console.error('Simulation failed', err);
      toast.error('Không thể giả lập thanh toán: ' + (err.response?.data?.error || err.message));
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formattedAmount = Number(amount || 0).toLocaleString('vi-VN');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-pink-100 flex justify-between items-center bg-gradient-to-r from-pink-50 via-rose-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-600 flex items-center justify-center shadow-md shadow-pink-600/30">
              <img 
                src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png" 
                alt="MoMo" 
                className="w-7 h-7 brightness-0 invert" 
              />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                Thanh toán qua Ví MoMo
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">Sandbox</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">Mã đơn hàng: <span className="font-mono font-bold text-pink-700">{orderId || 'Đang tạo...'}</span></p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-9 h-9 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Nội dung chính */}
        <div className="p-6 md:p-8 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-pink-500/20 border-t-pink-600 rounded-full animate-spin"></div>
              <p className="mt-4 text-slate-600 font-bold text-sm">Đang kết nối cổng MoMo Sandbox...</p>
              <p className="text-xs text-slate-400 mt-1">Đang khởi tạo chữ ký HMAC-SHA256 & mã QR giao dịch</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">error</span>
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Khởi tạo giao dịch thất bại</h3>
              <p className="text-sm text-red-600 font-medium mb-6 max-w-md mx-auto">{error}</p>
              <div className="flex justify-center gap-3">
                <button 
                  onClick={initPayment} 
                  className="px-6 py-2.5 bg-pink-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-pink-700 transition-colors shadow-md shadow-pink-600/20 cursor-pointer"
                >
                  Thử lại ngay
                </button>
                <button 
                  onClick={onClose} 
                  className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Tóm tắt thanh toán */}
              <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Nội dung thanh toán</span>
                  <span className="text-sm font-bold text-slate-800">{orderInfo || 'Nạp tiền vào ví FreelanceAI'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Số tiền cần trả</span>
                  <span className="text-xl font-black text-pink-600">{formattedAmount} VNĐ</span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-8 items-center">
                {/* Cột mã QR */}
                <div className="flex-1 w-full flex flex-col items-center border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-8">
                  <div className="p-4 bg-white border-2 border-pink-500 rounded-3xl shadow-lg shadow-pink-500/10 mb-3 relative group">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrCodeUrl)}`} 
                      alt="MoMo QR Code"
                      className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                    />
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 rounded-3xl transition-colors pointer-events-none"></div>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 bg-pink-50 px-3.5 py-1.5 rounded-full text-pink-700 font-bold text-[11px] uppercase tracking-wider">
                      <span className="w-2 h-2 bg-pink-500 rounded-full animate-ping"></span>
                      <span>Đang chờ quét mã...</span>
                    </div>

                    <div className="pt-2">
                      {payUrl && (
                        <a
                          href={payUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-pink-600/20 transition-all hover:scale-[1.02] active:scale-95"
                        >
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                          <span>Mở trang thanh toán MoMo Web</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cột hướng dẫn */}
                <div className="flex-1 w-full space-y-5">
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider text-center md:text-left">
                    Hướng dẫn thanh toán MoMo
                  </h3>

                  <ol className="space-y-3.5">
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Mở ứng dụng <strong>MoMo</strong> trên điện thoại hoặc bấm nút <strong>Mở trang MoMo Web</strong> ở bên.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Chọn <strong>"Quét mã"</strong> và hướng camera vào mã QR MoMo này.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Kiểm tra số tiền <strong>{formattedAmount} VNĐ</strong> và nhấn <strong>Xác nhận</strong> thanh toán.
                      </p>
                    </li>
                  </ol>

                  {/* Đồng hồ đếm ngược */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mã QR hết hạn sau</p>
                    <div className="text-2xl font-black text-slate-900 tabular-nums">
                      {timeLeft > 0 ? (
                        <span className={timeLeft < 60 ? 'text-red-500' : 'text-slate-800'}>
                          {formatTime(timeLeft)}
                        </span>
                      ) : (
                        <span className="text-red-500 text-sm font-bold">Mã giao dịch đã hết hạn</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/60 text-[11px] text-amber-800 leading-relaxed">
                    💡 <strong>Lưu ý Sandbox:</strong> Cổng thanh toán đang kết nối môi trường Thử nghiệm MoMo. Bạn có thể mở Web Checkout hoặc bấm nút <strong>Xác nhận Demo</strong> bên dưới để hoàn tất ngay.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <button 
            type="button"
            onClick={handleSimulateSuccess}
            disabled={loading || !!error}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            title="Duyệt nhanh giao dịch thành công (Dành cho việc chấm điểm / Demo đồ án)"
          >
            <span className="material-symbols-outlined text-sm">verified</span>
            <span>Xác nhận thanh toán (Demo nhanh)</span>
          </button>

          <button 
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoMoPaymentModal;

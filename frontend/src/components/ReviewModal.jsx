import React, { useState } from 'react';
import api from '../api';

import { toast } from 'react-hot-toast';
const ReviewModal = ({ isOpen, onClose, job, revieweeId, revieweeName, onSuccess }) => {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.post('reviews/', {
                reviewee: revieweeId,
                job: job.id,
                rating: rating,
                comment: comment
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error submitting review:", error);
            toast.error("Bạn đã đánh giá dự án này rồi hoặc có lỗi xảy ra.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800">Đánh giá dự án</h2>
                            <p className="text-sm text-slate-500 mt-1">Dành cho: <span className="font-bold text-emerald-600">{revieweeName}</span></p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <span className="material-symbols-outlined text-slate-400">close</span>
                        </button>
                    </div>

                    <div className="space-y-8">
                        {/* Star Rating */}
                        <div className="flex flex-col items-center">
                            <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 text-center">Mức độ hài lòng</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setRating(star)}
                                        className="transition-all hover:scale-125 active:scale-95"
                                    >
                                        <span className={`material-symbols-outlined text-4xl ${star <= rating ? 'text-amber-400' : 'text-slate-200'}`} style={{ fontVariationSettings: star <= rating ? "'FILL' 1" : "none" }}>
                                            star
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <span className="mt-3 text-sm font-bold text-slate-700">
                                {rating === 5 ? 'Tuyệt vời!' : rating === 4 ? 'Rất tốt' : rating === 3 ? 'Bình thường' : rating === 2 ? 'Kém' : 'Rất tệ'}
                            </span>
                        </div>

                        {/* Comment */}
                        <div>
                            <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-3 block">Nhận xét chi tiết</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-emerald-500 transition-all min-h-30"
                                placeholder="Hãy chia sẻ trải nghiệm của bạn khi làm việc cùng đối tác này..."
                            ></textarea>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 pt-4">
                            <button 
                                onClick={onClose}
                                className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                            >
                                Bỏ qua
                            </button>
                            <button 
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-2 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Đang gửi...' : 'Gửi đánh giá'}
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="bg-emerald-50 p-4 flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Đánh giá của bạn giúp xây dựng cộng đồng uy tín</span>
                </div>
            </div>
        </div>
    );
};

export default ReviewModal;

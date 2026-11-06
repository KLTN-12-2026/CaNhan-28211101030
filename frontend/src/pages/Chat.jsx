import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import FreelancerSidebar from '../components/FreelancerSidebar';
import FreelancerTopNav from '../components/FreelancerTopNav';
import ClientSidebar from '../components/ClientSidebar';
import ClientTopNav from '../components/ClientTopNav';

import { toast } from 'react-hot-toast';
const ChatPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const userId = sessionStorage.getItem('user_id');
    const userRole = sessionStorage.getItem('user_role'); // Đã sửa thành user_role
    
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const scrollRef = useRef(null);
    const [loadingConversations, setLoadingConversations] = useState(true);

    const [showOfferModal, setShowOfferModal] = useState(false);
    const [offerForm, setOfferForm] = useState({ application_id: '', salary: '', requirements: '', deadline: '' });
    const [activeApplications, setActiveApplications] = useState([]);
    
    // New states for Submission & Offer History
    const [showSubmissionModal, setShowSubmissionModal] = useState(false);
    const [submissionForm, setSubmissionForm] = useState({ application_id: '', note: '' });
    const [showOfferHistoryModal, setShowOfferHistoryModal] = useState(false);
    const [showSubmissionHistoryModal, setShowSubmissionHistoryModal] = useState(false);

    const [selectedUser, setSelectedUser] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    //const [loadingMessages, setLoadingMessages] = useState(false);
    const [profile, setProfile] = useState(null);
    const [company, setCompany] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const isSendingRef = useRef(false);

    const handleLogout = (e) => {
        if (e) e.preventDefault();
        if (window.confirm(t('common.logoutConfirm') || "Bạn có chắc chắn muốn đăng xuất không?")) {
            sessionStorage.clear();
            localStorage.clear();
            navigate('/');
        }
    };

    const fetchProfile = useCallback(async () => {
        try {
            if (userRole === 'client') {
                const res = await api.get('companies/');
                const allCompanies = res.data.results || res.data;
                const myCompany = allCompanies.find(c => String(c.user) === String(userId));
                setCompany(myCompany);
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

    const fetchOtherUser = useCallback(async (id) => {
        try {
            const response = await api.get(`messages/conversations/`);
            const convos = response.data;
            const existing = convos.find(c => String(c.other_user_id) === String(id));
            if (existing) {
                setSelectedUser({
                    id: existing.other_user_id,
                    name: existing.other_user_name,
                    avatar: existing.other_user_avatar
                });
            } else {
                setSelectedUser({ id: id, name: t('chat.newUser') || 'Người dùng mới' });
            }
        } catch (error) {
            console.error("Error fetching user info:", error);
        }
    }, [t]);

    const fetchConversations = useCallback(async () => {
        try {
            const response = await api.get('messages/conversations/');
            setConversations(response.data);
            setLoadingConversations(false);
        } catch (error) {
            console.error("Error fetching conversations:", error);
        }
    }, []);

    const fetchMessages = useCallback(async (otherId) => {
        try {
            const response = await api.get(`messages/?other_user_id=${otherId}`);
            setMessages(response.data.results || response.data);
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    }, []);

    const markAsRead = useCallback(async (otherId) => {
        try {
            await api.post('messages/mark_as_read/', { other_user_id: otherId });
            fetchConversations();
            window.dispatchEvent(new Event('messagesRead'));
        } catch (error) {
            console.error("Error marking messages as read:", error);
        }
    }, [fetchConversations]);

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const targetUserId = queryParams.get('user_id');
        if (targetUserId && !selectedUser) {
            fetchOtherUser(targetUserId);
        }
    }, [location, selectedUser, fetchOtherUser]);

    useEffect(() => {
        fetchConversations();
        if (userId) fetchProfile();
        const interval = setInterval(fetchConversations, 10000);
        return () => clearInterval(interval);
    }, [userId, fetchConversations, fetchProfile]);

    useEffect(() => {
        if (selectedUser) {
            fetchMessages(selectedUser.id);
            markAsRead(selectedUser.id);
            const interval = setInterval(() => fetchMessages(selectedUser.id), 3000);
            return () => clearInterval(interval);
        }
    }, [selectedUser, fetchMessages, markAsRead]);

    const prevUserIdRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            // Check if user is near the bottom
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
            // Check if this is a new conversation loading
            const isNewUser = prevUserIdRef.current !== selectedUser?.id;
            
            if (isNearBottom || isNewUser) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                if (messages.length > 0) {
                    prevUserIdRef.current = selectedUser?.id;
                }
            }
        }
    }, [messages, selectedUser]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleOpenOfferModal = async () => {
        try {
            const response = await api.get(`applications/?freelancer_user_id=${selectedUser.id}&client_user_id=${userId}&status=Interviewing`);
            const apps = response.data.results || response.data;
            setActiveApplications(apps);
            if (apps.length > 0) {
                setOfferForm(prev => ({ ...prev, application_id: apps[0].id }));
            }
            setShowOfferModal(true);
        } catch (e) {
            console.error(e);
            toast.error('Không thể tải danh sách dự án đang trao đổi.');
        }
    };

    const handleSendOffer = async (e) => {
        e.preventDefault();
        if (!offerForm.application_id) {
            toast.error("Vui lòng chọn công việc!");
            return;
        }
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('receiver', selectedUser.id);
            formData.append('content', 'Tôi muốn gửi cho bạn một đề nghị công việc.');
            formData.append('is_offer', 'true');
            formData.append('application_id', offerForm.application_id);
            formData.append('offer_details', JSON.stringify({
                salary: offerForm.salary,
                requirements: offerForm.requirements,
                deadline: offerForm.deadline
            }));

            const response = await api.post('messages/', formData);
            setMessages(prev => (prev.some(m => m.id === response.data.id) ? prev : [...prev, response.data]));
            setShowOfferModal(false);
            setOfferForm({ application_id: '', salary: '', requirements: '', deadline: '' });
            fetchConversations();
            
            setTimeout(() => {
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, 50);
        } catch (error) {
            console.error(error);
            toast.error('Có lỗi xảy ra khi gửi offer.');
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleOpenSubmissionModal = async () => {
        try {
            const response = await api.get(`applications/?freelancer_user_id=${userId}&client_user_id=${selectedUser.id}&status=Hired`);
            const apps = response.data.results || response.data;
            setActiveApplications(apps);
            if (apps.length > 0) {
                setSubmissionForm(prev => ({ ...prev, application_id: apps[0].id }));
            }
            setShowSubmissionModal(true);
        } catch (e) {
            console.error(e);
            toast.error('Không thể tải danh sách dự án đang thực hiện.');
        }
    };

    const handleSendSubmission = async (e) => {
        e.preventDefault();
        if (!submissionForm.application_id) {
            toast.error("Vui lòng chọn công việc!");
            return;
        }
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('receiver', selectedUser.id);
            formData.append('content', 'Tôi đã gửi sản phẩm / báo cáo hoàn thành công việc.');
            formData.append('is_submission', 'true');
            formData.append('application_id', submissionForm.application_id);
            formData.append('submission_details', JSON.stringify({
                note: submissionForm.note
            }));
            
            if (selectedFile) {
                if (selectedFile.type.startsWith('image/')) {
                    formData.append('image', selectedFile);
                } else {
                    formData.append('file', selectedFile);
                }
            }

            const response = await api.post('messages/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessages(prev => (prev.some(m => m.id === response.data.id) ? prev : [...prev, response.data]));
            setShowSubmissionModal(false);
            setSubmissionForm({ application_id: '', note: '' });
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchConversations();
            
            setTimeout(() => {
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, 50);
        } catch (error) {
            console.error(error);
            toast.error('Có lỗi xảy ra khi nộp sản phẩm.');
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleRespondOffer = async (msgId, action) => {
        try {
            const response = await api.post(`messages/${msgId}/respond_offer/`, { action });
            setMessages(prev => prev.map(m => m.id === msgId ? response.data : m));
            toast.success(action === 'accepted' ? 'Đã chấp nhận Offer thành công!' : 'Đã từ chối Offer.');
        } catch (e) {
            console.error(e);
            toast.error('Có lỗi xảy ra.');
        }
    };

    const handleRespondSubmission = async (msgId, action) => {
        try {
            const response = await api.post(`messages/${msgId}/respond_submission/`, { action });
            setMessages(prev => prev.map(m => m.id === msgId ? response.data : m));
            toast.success(action === 'approved' ? 'Đã duyệt sản phẩm thành công!' : 'Đã gửi yêu cầu sửa đổi.');
        } catch (e) {
            console.error(e);
            toast.error('Có lỗi xảy ra.');
        }
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (isSendingRef.current || isUploading) return;
        if ((!newMessage.trim() && !selectedFile) || !selectedUser) return;

        isSendingRef.current = true;
        setIsUploading(true);

        const textToSend = newMessage.trim();
        const fileToSend = selectedFile;

        // Reset ô nhập ngay lập tức để tránh double submit
        setNewMessage('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        try {
            const formData = new FormData();
            formData.append('receiver', selectedUser.id);
            if (textToSend) formData.append('content', textToSend);
            if (fileToSend) {
                if (fileToSend.type.startsWith('image/')) {
                    formData.append('image', fileToSend);
                } else {
                    formData.append('file', fileToSend);
                }
            }

            const response = await api.post('messages/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setMessages(prev => (prev.some(m => m.id === response.data.id) ? prev : [...prev, response.data]));
            fetchConversations();
            
            // Cuộn xuống cuối ngay khi vừa gửi tin nhắn
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 50);
        } catch (error) {
            console.error("Error sending message:", error);
            // Khôi phục lại text nếu gửi lỗi
            setNewMessage(textToSend);
            setSelectedFile(fileToSend);
            toast.error('Gửi tin nhắn thất bại, vui lòng thử lại!');
        } finally {
            setIsUploading(false);
            isSendingRef.current = false;
        }
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-[#f8fafc] min-h-screen font-['Inter'] antialiased flex">
            {userRole === 'client' ? (
                <ClientSidebar companyName={company?.company_name} handleLogout={handleLogout} />
            ) : (
                <FreelancerSidebar profile={profile} username={sessionStorage.getItem('username')} handleLogout={handleLogout} />
            )}
            
            <div className="flex-1 flex flex-col min-h-screen md:pl-64">
                {userRole === 'client' ? (
                    <ClientTopNav company={company} username={sessionStorage.getItem('username')} notifications={[]} />
                ) : (
                    <FreelancerTopNav profile={profile} username={sessionStorage.getItem('username')} notifications={[]} />
                )}

                <div className="flex-1 p-4 md:p-8 flex flex-col items-center justify-center overflow-hidden">
                    <div className="w-full max-w-350 flex h-[calc(100vh-180px)] bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden">
                        
                        <aside className="w-80 border-r border-slate-100 flex flex-col">
                            <div className="p-4 border-b border-slate-50">
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-sm">search</span>
                                    <input 
                                        type="text" 
                                        placeholder={t('chat.searchPlaceholder') || "Tìm kiếm hội thoại..."}
                                        className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {loadingConversations ? (
                                    <div className="p-10 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div></div>
                                ) : conversations.length === 0 ? (
                                    <div className="p-10 text-center text-slate-400 text-sm">{t('chat.noConversations') || 'Chưa có hội thoại nào.'}</div>
                                ) : (
                                    conversations.map(convo => (
                                        <div 
                                            key={convo.other_user_id}
                                            onClick={() => setSelectedUser({ 
                                                id: convo.other_user_id, 
                                                name: convo.other_user_name,
                                                avatar: convo.other_user_avatar 
                                            })}
                                            className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-all border-l-4 ${selectedUser?.id === convo.other_user_id ? 'bg-emerald-50/50 border-emerald-500' : 'border-transparent'}`}
                                        >
                                            <div className="relative">
                                                <img 
                                                    src={convo.other_user_avatar || `https://ui-avatars.com/api/?name=${convo.other_user_name}&background=random`} 
                                                    alt="Avatar" 
                                                    className="w-12 h-12 rounded-full object-cover shadow-sm border border-slate-100" 
                                                />
                                                {convo.unread_count > 0 && (
                                                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                                                        {convo.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <h3 className="font-bold text-sm text-slate-800 truncate">{convo.other_user_name}</h3>
                                                    <span className="text-[10px] text-slate-400">{formatTime(convo.timestamp)}</span>
                                                </div>
                                                <p className={`text-xs truncate ${convo.unread_count > 0 ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                                                    {convo.last_message}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </aside>

                        <main className="flex-1 flex flex-col bg-[#fcfdfe]">
                            {selectedUser ? (
                                <>
                                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                                        <div className="flex items-center gap-3">
                                            <img 
                                                src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${selectedUser.name}&background=random`} 
                                                alt="Avatar" 
                                                className="w-10 h-10 rounded-full object-cover border border-slate-100" 
                                            />
                                            <div>
                                                <h2 className="font-bold text-slate-800 leading-tight">{selectedUser.name}</h2>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{t('chat.online') || 'Đang trực tuyến'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                                                <span className="material-symbols-outlined">call</span>
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                                                <span className="material-symbols-outlined">videocam</span>
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                                                <span className="material-symbols-outlined">more_vert</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Safety Advisory Banner */}
                                    <div className="bg-amber-50/80 border-b border-amber-200/60 px-6 py-3 flex items-start gap-3 shrink-0">
                                        <span className="material-symbols-outlined text-amber-500 text-xl mt-0.5">security</span>
                                        <p className="text-xs text-amber-900 leading-relaxed">
                                            <strong className="font-bold uppercase tracking-wide mr-1">
                                                {t('chat.safetyNotice', 'Lưu ý an toàn:')}
                                            </strong> 
                                            {t('chat.safetyDesc', 'Vui lòng trao đổi rõ ràng mọi thông tin quan trọng (Ngân sách, Deadline, Khối lượng công việc) tại đây. Nội dung chat sẽ được dùng làm bằng chứng để bảo vệ quyền lợi của bạn trong trường hợp có tranh chấp hoặc đánh giá sai lệch.')}
                                        </p>
                                    </div>

                                    <div 
                                        ref={scrollRef}
                                        className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
                                    >
                                        {messages.map((msg, idx) => {
                                            const isMe = String(msg.sender) === String(userId);
                                            return (
                                                <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[70%] group`}>
                                                        <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm relative ${
                                                            isMe 
                                                            ? 'bg-emerald-600 text-white rounded-br-none' 
                                                            : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                                                        }`}>
                                                            {msg.is_offer ? (
                                                                <div className="bg-white text-slate-800 rounded-xl p-4 border border-emerald-100 shadow-sm mt-1 mb-1 min-w-[250px]">
                                                                    <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                                                                        <span className="material-symbols-outlined text-emerald-600">handshake</span>
                                                                        <h4 className="font-black uppercase tracking-wider text-xs text-emerald-900">{t('chat.offerTitle', 'Đề nghị công việc')}</h4>
                                                                    </div>
                                                                    <div className="space-y-2 text-xs">
                                                                        <div className="flex justify-between">
                                                                            <span className="text-slate-500 font-medium">{t('chat.salaryLabel', 'Mức lương:')}</span>
                                                                            <span className="font-bold text-slate-800">{msg.offer_details?.salary || t('chat.salaryNegotiable', 'Thỏa thuận')}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-slate-500 font-medium">{t('chat.deadlineLabel', 'Deadline:')}</span>
                                                                            <span className="font-bold text-slate-800">{msg.offer_details?.deadline || t('chat.noDeadline', 'Không xác định')}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-slate-500 font-medium block mb-1">{t('chat.reqLabel', 'Yêu cầu thêm:')}</span>
                                                                            <span className="font-medium text-slate-700 block whitespace-pre-line bg-slate-50 p-2 rounded border border-slate-100">{msg.offer_details?.requirements || t('chat.noReq', 'Không có')}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${msg.offer_status === 'accepted' ? 'bg-emerald-50 text-emerald-600' : msg.offer_status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                                                            {msg.offer_status === 'accepted' ? t('chat.offerAccepted', 'Đã chấp nhận') : msg.offer_status === 'rejected' ? t('chat.offerRejected', 'Đã từ chối') : t('chat.offerPending', 'Chờ phản hồi')}
                                                                        </span>
                                                                        
                                                                        {!isMe && msg.offer_status === 'pending' && userRole === 'freelancer' && (
                                                                            <div className="flex gap-2">
                                                                                <button onClick={() => handleRespondOffer(msg.id, 'accepted')} className="h-7 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase rounded transition-colors shadow-sm">{t('chat.acceptBtn', 'Đồng ý')}</button>
                                                                                <button onClick={() => handleRespondOffer(msg.id, 'rejected')} className="h-7 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] uppercase rounded transition-colors shadow-sm">{t('chat.rejectBtn', 'Từ chối')}</button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ) : msg.is_submission ? (
                                                                <div className="bg-white text-slate-800 rounded-xl p-4 border border-emerald-100 shadow-sm mt-1 mb-1 min-w-[250px]">
                                                                    <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                                                                        <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                                                                        <h4 className="font-black uppercase tracking-wider text-xs text-emerald-900">Báo cáo hoàn thành</h4>
                                                                    </div>
                                                                    <div className="space-y-2 text-xs">
                                                                        <div>
                                                                            <span className="text-slate-500 font-medium block mb-1">Ghi chú / Link đính kèm:</span>
                                                                            <span className="font-medium text-slate-700 block whitespace-pre-line bg-slate-50 p-2 rounded border border-slate-100">{msg.submission_details?.note || 'Không có'}</span>
                                                                        </div>
                                                                        {msg.file && (
                                                                            <a href={msg.file} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors">
                                                                                <span className="material-symbols-outlined text-sm">attach_file</span>
                                                                                <span className="font-bold">File đính kèm</span>
                                                                            </a>
                                                                        )}
                                                                        {msg.image && (
                                                                            <a href={msg.image} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors">
                                                                                <span className="material-symbols-outlined text-sm">image</span>
                                                                                <span className="font-bold">Ảnh đính kèm</span>
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${msg.submission_status === 'approved' ? 'bg-emerald-50 text-emerald-600' : msg.submission_status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                                                            {msg.submission_status === 'approved' ? 'Đã duyệt' : msg.submission_status === 'rejected' ? 'Yêu cầu sửa' : 'Chờ duyệt'}
                                                                        </span>
                                                                        
                                                                        {!isMe && msg.submission_status === 'pending' && userRole === 'client' && (
                                                                            <div className="flex gap-2">
                                                                                <button onClick={() => handleRespondSubmission(msg.id, 'approved')} className="h-7 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase rounded transition-colors shadow-sm">Duyệt</button>
                                                                                <button onClick={() => handleRespondSubmission(msg.id, 'rejected')} className="h-7 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] uppercase rounded transition-colors shadow-sm">Y/C Sửa</button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    {msg.content && <p>{msg.content}</p>}
                                                                    
                                                                    {msg.image && (
                                                                        <div className="mt-2 rounded-lg overflow-hidden border border-white/20">
                                                                            <img 
                                                                                src={msg.image} 
                                                                                alt="Sent" 
                                                                                className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                                                                onClick={() => window.open(msg.image, '_blank')}
                                                                            />
                                                                        </div>
                                                                    )}

                                                                    {msg.file && (
                                                                        <a 
                                                                            href={msg.file} 
                                                                            target="_blank" 
                                                                            rel="noopener noreferrer"
                                                                            className={`mt-2 flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                                                                isMe 
                                                                                ? 'bg-white/10 border-white/20 hover:bg-white/20' 
                                                                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                                                            }`}
                                                                        >
                                                                            <span className="material-symbols-outlined text-2xl">description</span>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-[11px] font-bold truncate">
                                                                                    {msg.file.split('/').pop()}
                                                                                </p>
                                                                                <p className="text-[9px] opacity-70 uppercase font-black tracking-widest">{t('chat.file') || 'Tệp tin'}</p>
                                                                            </div>
                                                                            <span className="material-symbols-outlined text-lg">download</span>
                                                                        </a>
                                                                    )}
                                                                </>
                                                            )}

                                                            <span className={`text-[9px] block mt-1.5 opacity-60 ${isMe ? 'text-right' : 'text-left'}`}>
                                                                {formatTime(msg.created_at)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="p-4 bg-white border-t border-slate-100">
                                        {selectedFile && (
                                            <div className="mb-3 p-3 bg-emerald-50 rounded-2xl flex items-center justify-between border border-emerald-100 animate-in fade-in slide-in-from-bottom-2">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                                                        <span className="material-symbols-outlined">
                                                            {selectedFile.type.startsWith('image/') ? 'image' : 'description'}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-emerald-900 truncate">{selectedFile.name}</p>
                                                        <p className="text-[10px] text-emerald-600">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => setSelectedFile(null)}
                                                    className="p-1.5 hover:bg-emerald-200 rounded-full text-emerald-600 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                </button>
                                            </div>
                                        )}

                                        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                                            <input 
                                                type="file" 
                                                ref={fileInputRef}
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                            <div className="flex items-center gap-1">
                                                {userRole === 'client' && (
                                                    <>
                                                        <button 
                                                            type="button" 
                                                            onClick={handleOpenOfferModal}
                                                            className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-[0_4px_14px_0_rgba(5,150,105,0.39)] transition-all flex items-center gap-2 font-bold text-[13px] uppercase tracking-wide whitespace-nowrap active:scale-95"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">handshake</span>
                                                            <span className="hidden sm:inline">{t('chat.sendOffer', 'Gửi Đề Nghị')}</span>
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setShowOfferHistoryModal(true)}
                                                            className="h-11 px-4 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl transition-all flex items-center gap-2 font-bold text-[13px] uppercase tracking-wide whitespace-nowrap active:scale-95"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">history</span>
                                                            <span className="hidden sm:inline">Lịch sử Offer</span>
                                                        </button>
                                                    </>
                                                )}
                                                {userRole === 'freelancer' && (
                                                    <button 
                                                        type="button" 
                                                        onClick={handleOpenSubmissionModal}
                                                        className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-[0_4px_14px_0_rgba(5,150,105,0.39)] transition-all flex items-center gap-2 font-bold text-[13px] uppercase tracking-wide whitespace-nowrap active:scale-95"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">check_circle</span>
                                                        <span className="hidden sm:inline">Nộp Sản Phẩm</span>
                                                    </button>
                                                )}
                                                <button 
                                                    type="button" 
                                                    onClick={() => setShowSubmissionHistoryModal(true)}
                                                    className="h-11 px-4 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-xl transition-all flex items-center gap-2 font-bold text-[13px] uppercase tracking-wide whitespace-nowrap active:scale-95"
                                                >
                                                    <span className="material-symbols-outlined text-lg">history</span>
                                                    <span className="hidden sm:inline">Lịch sử nộp</span>
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                                                    title={t('chat.attach') || "Đính kèm"}
                                                >
                                                    <span className="material-symbols-outlined">add_circle</span>
                                                </button>
                                            </div>
                                            <div className="flex-1 relative">
                                                <input 
                                                    type="text" 
                                                    value={newMessage}
                                                    onChange={(e) => setNewMessage(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && e.nativeEvent.isComposing) {
                                                            // Đang gõ tiếng Việt có dấu (IME), chặn submit sớm
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    placeholder={t('chat.typeMessage') || "Viết tin nhắn của bạn..."}
                                                    disabled={isUploading}
                                                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all pr-12 disabled:opacity-50"
                                                />
                                                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors">
                                                    <span className="material-symbols-outlined text-lg">mood</span>
                                                </button>
                                            </div>
                                            <button 
                                                type="submit"
                                                disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                                                className="bg-emerald-600 text-white p-3 rounded-2xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                            >
                                                {isUploading ? (
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                ) : (
                                                    <span className="material-symbols-outlined">send</span>
                                                )}
                                            </button>
                                        </form>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-slate-50/30">
                                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl mb-6 border border-slate-100">
                                        <span className="material-symbols-outlined text-4xl text-emerald-500">chat_bubble</span>
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-800 mb-2">{t('chat.selectToStart') || 'Chọn một hội thoại để bắt đầu'}</h2>
                                    <p className="text-sm text-slate-400 max-w-xs">{t('chat.selectDesc') || 'Chọn người dùng từ danh sách bên trái để xem lịch sử tin nhắn và trao đổi về công việc.'}</p>
                                </div>
                            )}
                        </main>
                    </div>
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
            {/* Offer Modal */}
            {showOfferModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/30">
                            <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg">
                                <span className="material-symbols-outlined text-emerald-600">handshake</span>
                                {t('chat.sendOfferModalTitle', 'Gửi Đề Nghị Công Việc')}
                            </h3>
                            <button onClick={() => setShowOfferModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSendOffer} className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">{t('chat.selectProjectLabel', 'Chọn dự án đang trao đổi')} *</label>
                                <select 
                                    value={offerForm.application_id}
                                    onChange={e => setOfferForm({...offerForm, application_id: e.target.value})}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="" disabled>{t('chat.selectProjectDefault', '-- Chọn dự án --')}</option>
                                    {activeApplications.map(app => (
                                        <option key={app.id} value={app.id}>{app.job?.title || 'Dự án ID: ' + app.job}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">{t('chat.salaryOfferLabel', 'Mức lương đề nghị')} *</label>
                                <input 
                                    type="text" 
                                    value={offerForm.salary}
                                    onChange={e => setOfferForm({...offerForm, salary: e.target.value})}
                                    placeholder={t('chat.salaryPlaceholder', 'VD: 5,000,000 VNĐ hoặc $500')}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">{t('chat.deadlineOfferLabel', 'Deadline')} *</label>
                                <input 
                                    type="text" 
                                    value={offerForm.deadline}
                                    onChange={e => setOfferForm({...offerForm, deadline: e.target.value})}
                                    placeholder={t('chat.deadlinePlaceholder', 'VD: 15/12/2026 hoặc 2 tuần')}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">{t('chat.detailsLabel', 'Yêu cầu chi tiết')}</label>
                                <textarea 
                                    value={offerForm.requirements}
                                    onChange={e => setOfferForm({...offerForm, requirements: e.target.value})}
                                    placeholder={t('chat.detailsPlaceholder', 'Mô tả thêm các yêu cầu cụ thể...')}
                                    rows="3"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none custom-scrollbar"
                                />
                            </div>
                            <div className="mt-2">
                                <button type="submit" disabled={isUploading || activeApplications.length === 0} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-wider text-sm transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isUploading ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> : <span className="material-symbols-outlined text-lg">send</span>}
                                    {activeApplications.length === 0 ? t('chat.noProjects', 'Không có dự án phù hợp') : t('chat.sendOfferBtn', 'Gửi Đề Nghị')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Submission Modal */}
            {showSubmissionModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/30">
                            <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg">
                                <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                                Xác nhận hoàn thành
                            </h3>
                            <button onClick={() => setShowSubmissionModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSendSubmission} className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Chọn dự án cần nộp *</label>
                                <select 
                                    value={submissionForm.application_id}
                                    onChange={e => setSubmissionForm({...submissionForm, application_id: e.target.value})}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="" disabled>-- Chọn dự án --</option>
                                    {activeApplications.map(app => (
                                        <option key={app.id} value={app.id}>{app.job?.title || 'Dự án ID: ' + app.job}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Ghi chú / Link sản phẩm</label>
                                <textarea 
                                    value={submissionForm.note}
                                    onChange={e => setSubmissionForm({...submissionForm, note: e.target.value})}
                                    placeholder="Ghi chú, link Google Drive, Github..."
                                    rows="3"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none custom-scrollbar"
                                />
                            </div>
                            <div className="mt-2">
                                <button type="submit" disabled={isUploading || activeApplications.length === 0} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-wider text-sm transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isUploading ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> : <span className="material-symbols-outlined text-lg">send</span>}
                                    {activeApplications.length === 0 ? 'Không có dự án phù hợp' : 'Gửi Sản Phẩm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Offer History Modal */}
            {showOfferHistoryModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-amber-50/30">
                            <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg">
                                <span className="material-symbols-outlined text-amber-600">history</span>
                                Lịch sử Offer đã gửi
                            </h3>
                            <button onClick={() => setShowOfferHistoryModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                            {messages.filter(m => m.is_offer).length === 0 ? (
                                <p className="text-center text-slate-500 py-4">Chưa có Offer nào được gửi trong cuộc trò chuyện này.</p>
                            ) : (
                                messages.filter(m => m.is_offer).map((msg, idx) => (
                                    <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-2 relative">
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-bold text-slate-500">{formatDate(msg.created_at)}</span>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                                                msg.offer_status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                                                msg.offer_status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {msg.offer_status}
                                            </span>
                                        </div>
                                        <div className="text-sm">
                                            <p><span className="font-bold text-slate-700">Mức lương:</span> {msg.offer_details?.salary || 'N/A'}</p>
                                            <p><span className="font-bold text-slate-700">Deadline:</span> {msg.offer_details?.deadline || 'N/A'}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Submission History Modal */}
            {showSubmissionHistoryModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-blue-50/30">
                            <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg">
                                <span className="material-symbols-outlined text-blue-600">history</span>
                                Lịch sử nộp minh chứng
                            </h3>
                            <button onClick={() => setShowSubmissionHistoryModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                            {messages.filter(m => m.is_submission).length === 0 ? (
                                <p className="text-center text-slate-500 py-4">Chưa có minh chứng nào được nộp trong cuộc trò chuyện này.</p>
                            ) : (
                                messages.filter(m => m.is_submission).map((msg, idx) => (
                                    <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-2 relative">
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-bold text-slate-500">{formatDate(msg.created_at)}</span>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                                                msg.submission_status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                msg.submission_status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {msg.submission_status === 'approved' ? 'Đã duyệt' : msg.submission_status === 'rejected' ? 'Yêu cầu sửa' : 'Chờ duyệt'}
                                            </span>
                                        </div>
                                        <div className="text-sm">
                                            <p><span className="font-bold text-slate-700">Ghi chú:</span> {msg.submission_details?.note || 'Không có'}</p>
                                            {msg.file && <p><a href={msg.file} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Xem file đính kèm</a></p>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatPage;

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import api from '../api';
import ClientSidebar from '../components/ClientSidebar';
import FreelancerSidebar from '../components/FreelancerSidebar';
import FreelancerTopNav from '../components/FreelancerTopNav';
import ClientTopNav from '../components/ClientTopNav';
import { useTranslation } from 'react-i18next';

import { toast } from 'react-hot-toast';
function AIChat() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const userId = sessionStorage.getItem('user_id');
    const messagesEndRef = useRef(null);

    const [company, setCompany] = useState(null);
    const [profile, setProfile] = useState(null);
    const role = sessionStorage.getItem('user_role') || 'client';
    const [loading, setLoading] = useState(true);

    // STATE QUẢN LÝ CHAT
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const isSendingRef = useRef(false);
    const [messages, setMessages] = useState([]);
    const [chatHistoryList, setChatHistoryList] = useState([]);
    const [selectedHistoryId, setSelectedHistoryId] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: null,
        isDanger: false
    });
    const [currentSessionId, setCurrentSessionId] = useState(() => {
        let sid = sessionStorage.getItem('current_ai_chat_session_id');
        if (!sid) {
            sid = 'session-' + Date.now();
            sessionStorage.setItem('current_ai_chat_session_id', sid);
        }
        return sid;
    });

    const welcomeMessage = useMemo(() => ({
        id: 'welcome',
        sender: 'ai',
        text: t('aiChat.welcome') || 'Xin chào! Tôi là AI Assistant của FreelanceAI. Tôi có thể giúp bạn tối ưu JD, phân tích thị trường lương, hoặc đánh giá ứng viên. Bạn muốn bắt đầu từ đâu?'
    }), [t]);

    // Cuộn xuống cuối mỗi khi có tin nhắn mới
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, scrollToBottom]);

    // XỬ LÝ ĐĂNG XUẤT
    const handleLogout = (e) => {
        if (e) e.preventDefault();
        setConfirmDialog({
            isOpen: true,
            title: t('aiChat.logout') || "Đăng Xuất",
            message: t('aiChat.logoutConfirm') || "Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?",
            isDanger: false,
            onConfirm: () => {
                sessionStorage.clear();
                navigate('/');
            }
        });
    };

    // LẤY THÔNG TIN USER (Company cho Client, Profile cho Freelancer)
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                if (role === 'client') {
                    const response = await api.get('companies/');
                    const allCompanies = response.data.results || response.data;
                    const currentCompany = allCompanies.find(c => String(c.user) === String(userId));
                    if (currentCompany) setCompany(currentCompany);
                } else {
                    const response = await api.get('freelancers/');
                    const allProfiles = response.data.results || response.data;
                    const myProfile = allProfiles.find(p => String(p.user) === String(userId));
                    if (myProfile) setProfile(myProfile);
                }
            } catch (error) {
                console.error("Lỗi khi tải dữ liệu:", error);
            } finally {
                setLoading(false);
            }
        };

        if (userId) fetchUserData();
        else setLoading(false);
    }, [userId, role]);

    // HÀM TẢI DANH SÁCH LỊCH SỬ ĐỂ HIỂN THỊ Ở SIDEBAR
    const fetchChatHistoryList = useCallback(async () => {
        try {
            const response = await api.get('chat-history/');
            const historyData = response.data.results || response.data;

            // Group by session_id
            const groups = {};
            historyData.forEach(item => {
                const sid = item.session_id || 'legacy-no-session';
                if (!groups[sid]) {
                    groups[sid] = [];
                }
                groups[sid].push(item);
            });

            // Convert to array of sessions for sidebar
            const sessionList = Object.keys(groups).map(sid => {
                // Sort messages in this session by timestamp ascending
                const sessionMessages = groups[sid].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                return {
                    sessionId: sid,
                    title: sessionMessages[0].user_message, // Use the first message of the session as title
                    messages: sessionMessages,
                    timestamp: sessionMessages[0].timestamp
                };
            }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Most recent sessions first

            setChatHistoryList(sessionList);

            // BỐC LỊCH SỬ CỦA PHIÊN HIỆN TẠI RA MÀN HÌNH CHÍNH NẾU ĐANG TRỐNG
            setMessages(prevMessages => {
                if (prevMessages.length <= 1) {
                    const currentSid = sessionStorage.getItem('current_ai_chat_session_id');
                    const activeSession = sessionList.find(s => s.sessionId === currentSid);
                    if (activeSession) {
                        setSelectedHistoryId(activeSession.sessionId);
                        const sessionMsgs = [welcomeMessage];
                        activeSession.messages.forEach(item => {
                            sessionMsgs.push({ id: `msg-user-${item.id}`, sender: 'user', text: item.user_message });
                            sessionMsgs.push({ id: `msg-ai-${item.id}`, sender: 'ai', text: item.ai_response });
                        });
                        return sessionMsgs;
                    }
                }
                return prevMessages;
            });
        } catch (error) {
            console.error("Lỗi khi tải danh sách lịch sử:", error);
        }
    }, [welcomeMessage]);

    useEffect(() => {
        if (userId) fetchChatHistoryList();
    }, [userId, fetchChatHistoryList]);

    // HÀM CHỌN MỘT TIN NHẮN CŨ ĐỂ XEM
    const handleSelectHistory = (session) => {
        setSelectedHistoryId(session.sessionId);
        setCurrentSessionId(session.sessionId);

        const sessionMsgs = [welcomeMessage];
        session.messages.forEach(item => {
            sessionMsgs.push({ id: `msg-user-${item.id}`, sender: 'user', text: item.user_message });
            sessionMsgs.push({ id: `msg-ai-${item.id}`, sender: 'ai', text: item.ai_response });
        });

        setMessages(sessionMsgs);
    };

    // HÀM BẮT ĐẦU CHAT MỚI
    const handleNewChat = () => {
        setSelectedHistoryId(null);
        // Start a fresh session
        const sid = 'session-' + Date.now();
        sessionStorage.setItem('current_ai_chat_session_id', sid);
        setCurrentSessionId(sid);
        setMessages([welcomeMessage]);
    };

    // HÀM XÓA MỘT PHIÊN CHAT
    const handleDeleteSession = async (e, sessionId) => {
        e.stopPropagation();
        setConfirmDialog({
            isOpen: true,
            title: "Xóa Phiên Trò Chuyện",
            message: "Bạn có chắc chắn muốn xóa phiên trò chuyện này không? Dữ liệu không thể khôi phục.",
            isDanger: true,
            onConfirm: async () => {
                try {
                    await api.delete(`chat-history/delete_session/?session_id=${sessionId}`);
                    toast.success("Đã xóa phiên trò chuyện.");
                    if (currentSessionId === sessionId) {
                        handleNewChat();
                    }
                    fetchChatHistoryList();
                } catch (error) {
                    console.error("Lỗi xóa session:", error);
                    toast.error("Không thể xóa phiên trò chuyện.");
                }
            }
        });
    };

    // HÀM XÓA TẤT CẢ
    const handleDeleteAllHistory = async () => {
        setConfirmDialog({
            isOpen: true,
            title: "Xóa Toàn Bộ Lịch Sử",
            message: "Bạn có chắc chắn muốn XÓA TOÀN BỘ lịch sử trò chuyện? Hành động này không thể hoàn tác.",
            isDanger: true,
            onConfirm: async () => {
                try {
                    await api.delete('chat-history/delete_all/');
                    toast.success("Đã xóa toàn bộ lịch sử trò chuyện.");
                    handleNewChat();
                    fetchChatHistoryList();
                } catch (error) {
                    console.error("Lỗi xóa toàn bộ lịch sử:", error);
                    toast.error("Không thể xóa toàn bộ lịch sử.");
                }
            }
        });
    };

    // Khởi tạo tin nhắn chào mừng
    useEffect(() => {
        if (messages.length === 0) setMessages([welcomeMessage]);
    }, [messages.length, welcomeMessage]);

    // HÀM GỬI TIN NHẮN
    const handleSendMessage = async (textToSend) => {
        const text = (typeof textToSend === 'string' ? textToSend : inputValue).trim();
        if (!text || isSendingRef.current || isTyping) return;

        isSendingRef.current = true;
        setIsTyping(true);
        setInputValue("");

        const newUserMessage = { id: `user-${Date.now()}`, sender: 'user', text: text };
        setMessages(prev => [...prev, newUserMessage]);

        try {
            const response = await api.post('ai-chat/', {
                user_message: text,
                session_id: currentSessionId
            });
            const newAiMessage = {
                id: `ai-${Date.now() + 1}`,
                sender: 'ai',
                text: response.data.ai_response
            };
            setMessages(prev => [...prev, newAiMessage]);
            fetchChatHistoryList(); // Cập nhật lại danh sách bên trái
        } catch (error) {
            console.error("Lỗi gửi tin nhắn:", error);
            const errorText = error.response?.data?.error || t('aiChat.overload') || "AI đang quá tải, vui lòng thử lại sau!";
            const errorMessage = { id: `err-${Date.now() + 1}`, sender: 'ai', text: errorText };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
            isSendingRef.current = false;
        }
    };

    // HÀM PHÂN TÍCH CV (DÀNH RIÊNG CHO FREELANCER)
    const handleAnalyzeCV = async () => {
        if (isSendingRef.current || isTyping) return;
        if (role !== 'freelancer') {
            toast(t('aiChat.freelancerOnly') || "Tính năng này chỉ dành cho Freelancer!");
            return;
        }

        isSendingRef.current = true;
        const newUserMessage = { id: `user-cv-${Date.now()}`, sender: 'user', text: t('aiChat.analyzeCVPrompt') || "Phân tích CV của tôi" };
        setMessages(prev => [...prev, newUserMessage]);
        setIsTyping(true);

        try {
            const response = await api.post('ai-analyze-cv/');
            let analysisText = "";

            if (typeof response.data.analysis === 'object') {
                const data = response.data.analysis;
                analysisText = `### ${t('aiChat.cvAnalysisTitle') || "KẾT QUẢ PHÂN TÍCH CV"}\n\n`;
                analysisText += `**🌟 ${t('aiChat.summary') || "Tổng quan"}:** ${data.summary}\n\n`;
                analysisText += `**💪 ${t('aiChat.strengths') || "Điểm mạnh"}:**\n${data.strengths.map(s => `- ${s}`).join('\n')}\n\n`;
                analysisText += `**🎯 ${t('aiChat.weaknesses') || "Điểm yếu"}:**\n${data.weaknesses.map(w => `- ${w}`).join('\n')}\n\n`;
                analysisText += `**🚀 ${t('aiChat.proposedRoadmap') || "Lộ trình đề xuất"}:**\n`;
                data.roadmap.forEach(m => {
                    analysisText += `\n**${m.milestone}**\n`;
                    m.tasks.forEach(t => {
                        analysisText += `- ${t.task} (${t.priority})\n`;
                    });
                });
            } else {
                analysisText = response.data.analysis;
            }

            const newAiMessage = {
                id: Date.now() + 1,
                sender: 'ai',
                text: analysisText
            };
            setMessages(prev => [...prev, newAiMessage]);
            
            // LƯU KẾT QUẢ VÀO DATABASE ĐỂ KHÔNG BỊ MẤT KHI F5
            try {
                await api.post('chat-history/', {
                    user_message: t('aiChat.analyzeCVPrompt') || "Phân tích CV của tôi",
                    ai_response: analysisText,
                    session_id: currentSessionId
                });
                fetchChatHistoryList(); // Cập nhật lại danh sách bên trái
            } catch (saveError) {
                console.error("Lỗi lưu lịch sử CV:", saveError);
            }
        } catch (error) {
            console.error("Lỗi phân tích CV:", error);
            const msg = error.response?.data?.error || t('aiChat.cvReadError') || "Lỗi đọc CV!";
            const errorMessage = { id: Date.now() + 1, sender: 'ai', text: msg };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
            isSendingRef.current = false;
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (e.nativeEvent.isComposing) {
                // Đang gõ tiếng Việt có dấu (IME), không gửi tin nhắn
                return;
            }
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (loading) return <div className="flex justify-center items-center min-h-screen text-primary font-bold">{t('aiChat.loading') || "Đang tải..."}</div>;

    return (
        <div className="bg-surface font-body text-on-surface antialiased min-h-screen overflow-hidden">
            {/* TopNavBar Đồng bộ */}
            {role === 'client' ? (
                <ClientTopNav
                    company={company}
                    username={sessionStorage.getItem('username')}
                    notifications={[]}
                />
            ) : (
                <FreelancerTopNav
                    profile={profile}
                    username={sessionStorage.getItem('username')}
                    notifications={[]}
                />
            )}

            {/* Sidebar Đồng bộ */}
            {role === 'client' ? (
                <ClientSidebar companyName={company?.company_name} handleLogout={handleLogout} />
            ) : (
                <FreelancerSidebar profile={profile} username={sessionStorage.getItem('username')} handleLogout={handleLogout} />
            )}

            {/* INNER SIDEBAR: CHAT HISTORY */}
            <aside className="hidden md:flex flex-col fixed left-64 top-16 w-72 h-[calc(100vh-64px)] bg-white border-r border-slate-200 z-30">
                <div className="p-4">
                    <button
                        onClick={handleNewChat}
                        className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-primary hover:bg-surface-tint text-white rounded-2xl font-bold transition-all shadow-lg shadow-primary/20 mb-6 group active:scale-95"
                    >
                        <span className="material-symbols-outlined text-xl group-hover:rotate-90 transition-transform duration-300">add</span>
                        <span className="tracking-tight">{t('aiChat.newChat')}</span>
                    </button>

                    <div className="flex items-center justify-between mb-2 px-2">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('aiChat.recentHistory') || 'Lịch sử gần đây'}</h3>
                        {chatHistoryList.length > 0 && (
                            <button 
                                onClick={handleDeleteAllHistory}
                                className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase transition-colors"
                                title="Xóa toàn bộ"
                            >
                                Xóa tất cả
                            </button>
                        )}
                    </div>
                    <p className="text-[10px] text-teal-600 mb-4 px-2 italic">Lịch sử sẽ tự động dọn dẹp sau 30 ngày.</p>

                    <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar pr-1">
                        {chatHistoryList.length === 0 ? (
                            <div className="px-4 py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                                <span className="material-symbols-outlined text-slate-300 text-3xl mb-2">history</span>
                                <p className="text-xs text-slate-400">{t('aiChat.noHistory') || 'Chưa có lịch sử chat'}</p>
                            </div>
                        ) : (
                            chatHistoryList.map((session) => (
                                <button
                                    key={session.sessionId}
                                    onClick={() => handleSelectHistory(session)}
                                    className={`w-full text-left p-3 rounded-xl transition-all group flex items-start gap-3 relative ${selectedHistoryId === session.sessionId
                                        ? 'bg-teal-50 text-teal-700 border border-teal-100'
                                        : 'hover:bg-slate-50 text-slate-600'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-sm mt-0.5 opacity-50 group-hover:opacity-100">chat_bubble</span>
                                    <span className="text-xs font-semibold line-clamp-2 leading-relaxed pr-6">
                                        {session.title}
                                    </span>
                                    <span 
                                        className="material-symbols-outlined absolute right-2 top-3 text-[16px] text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-10"
                                        onClick={(e) => handleDeleteSession(e, session.sessionId)}
                                        title="Xóa phiên này"
                                    >
                                        delete
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="md:ml-136 lg:mr-80 pt-24 h-screen flex flex-col relative transition-all">

                {/* Header Info */}
                <div className="px-8 py-4 flex items-center justify-between bg-surface/90 backdrop-blur-sm sticky top-0 z-10 border-b border-outline-variant/10">
                    <div>
                        <h1 className="text-xl font-bold text-on-surface">{t('aiChat.title') || 'AI Chat Assistant'}</h1>
                        <p className="text-sm text-on-surface-variant/70">{t('aiChat.subtitle') || 'Hỗ trợ tuyển dụng và phân tích kỹ năng'}</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-container/10 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></div>
                        <span className="text-xs font-semibold text-on-primary-container">AI Online</span>
                    </div>
                </div>

                {/* Chat History Area */}
                <div className="flex-1 overflow-y-auto px-8 pb-32 pt-6 space-y-8 scroll-smooth custom-scrollbar">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            id={msg.id}
                            className={`flex items-start gap-4 max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                        >
                            {/* Avatar */}
                            {msg.sender === 'ai' ? (
                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-primary-container flex items-center justify-center shrink-0 shadow-sm">
                                    <span className="material-symbols-outlined text-white text-lg">smart_toy</span>
                                </div>
                            ) : (
                                <img
                                    alt="Me"
                                    className="w-10 h-10 rounded-full border-2 border-primary-container/30 shrink-0 object-cover"
                                    src={(role === 'client' ? company?.logo : profile?.avatar) || `https://ui-avatars.com/api/?name=${sessionStorage.getItem('username') || 'User'}`}
                                />
                            )}

                            {/* Message Bubble */}
                            <div className={`p-4 leading-relaxed ${msg.sender === 'user'
                                ? 'bg-primary text-white rounded-3xl rounded-tr-none shadow-md font-medium'
                                : 'bg-white text-slate-800 rounded-2xl rounded-tl-none shadow-sm border border-outline-variant/20 prose prose-slate prose-sm max-w-none'
                                }`}
                            >
                                {msg.sender === 'ai' ? (
                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                ) : (
                                    <div className="whitespace-pre-wrap">{msg.text}</div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isTyping && (
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-primary-container flex items-center justify-center shrink-0 shadow-sm">
                                <span className="material-symbols-outlined text-white text-lg">smart_toy</span>
                            </div>
                            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-outline-variant/20 flex gap-1 items-center h-12">
                                <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-primary/80 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Section */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-linear-to-t from-surface via-surface to-transparent">
                    <div className="max-w-4xl mx-auto flex items-end gap-3 bg-white p-2 pl-4 rounded-3xl shadow-xl shadow-teal-900/5 border border-outline-variant/20 focus-within:border-primary/50 transition-colors">
                        <button className="p-3 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-primary">
                            <span className="material-symbols-outlined">attach_file</span>
                        </button>
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isTyping}
                            className="flex-1 bg-transparent border-none focus:ring-0 py-4 text-on-surface resize-none max-h-32 min-h-14 text-sm disabled:opacity-50"
                            placeholder={t('aiChat.placeholder') || "Nhập câu hỏi tại đây..."}
                            rows="1"
                        ></textarea>
                        <button
                            onClick={() => handleSendMessage()}
                            disabled={!inputValue.trim() || isTyping}
                            className={`p-4 rounded-full transition-all shadow-md flex items-center justify-center ${inputValue.trim() && !isTyping ? 'bg-primary text-white hover:bg-teal-800 active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        >
                            <span className="material-symbols-outlined text-lg">send</span>
                        </button>
                    </div>
                </div>
            </main>

            {/* Right Sidebar: AI Insights & Suggestions */}
            <aside className="hidden lg:block w-80 h-screen fixed right-0 top-0 pt-24 pb-8 px-6 bg-slate-50/50 border-l border-outline-variant/20 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-800">{t('aiChat.suggestions') || 'Gợi ý từ AI'}</h3>
                    <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <div onClick={() => handleSendMessage(t('aiChat.writeJDPrompt') || "Viết một JD cho vị trí Senior React Developer")} className="group p-4 bg-white rounded-2xl border border-slate-200 hover:border-primary/40 transition-all cursor-pointer shadow-sm hover:shadow-md">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center mb-2 group-hover:bg-primary transition-colors">
                            <span className="material-symbols-outlined text-primary text-sm group-hover:text-white">edit_document</span>
                        </div>
                        <h4 className="font-bold text-sm mb-1 text-slate-800">{t('aiChat.writeJD') || 'Viết JD chuẩn'}</h4>
                        <p className="text-xs text-slate-500">{t('aiChat.writeJDDesc') || 'AI giúp bạn tạo mô tả công việc thu hút.'}</p>
                    </div>

                    <div onClick={() => handleSendMessage(t('aiChat.salaryPrompt') || "Mức lương trung bình của Designer là bao nhiêu?")} className="group p-4 bg-white rounded-2xl border border-slate-200 hover:border-primary/40 transition-all cursor-pointer shadow-sm hover:shadow-md">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mb-2 group-hover:bg-indigo-500 transition-colors">
                            <span className="material-symbols-outlined text-indigo-600 text-sm group-hover:text-white">payments</span>
                        </div>
                        <h4 className="font-bold text-sm mb-1 text-slate-800">{t('aiChat.salaryAnalysis') || 'Phân tích lương'}</h4>
                        <p className="text-xs text-slate-500">{t('aiChat.salaryAnalysisDesc') || 'Xem báo cáo mức lương thị trường.'}</p>
                    </div>

                    {role === 'freelancer' ? (
                        <div onClick={handleAnalyzeCV} className="group p-4 bg-primary/5 rounded-2xl border border-primary/20 hover:bg-primary hover:text-white transition-all cursor-pointer shadow-sm hover:shadow-md">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mb-2 group-hover:bg-white transition-colors">
                                <span className="material-symbols-outlined text-white text-sm group-hover:text-primary">psychology</span>
                            </div>
                            <h4 className="font-bold text-sm mb-1">{t('aiChat.analyzeCV') || 'Phân tích CV'}</h4>
                            <p className="text-xs opacity-70">{t('aiChat.analyzeCVDesc') || 'Khám phá kỹ năng qua CV của bạn.'}</p>
                        </div>
                    ) : (
                        <div onClick={() => handleSendMessage(t('aiChat.analyzeCandidatePrompt') || "Đánh giá ứng viên này có phù hợp không?")} className="group p-4 bg-white rounded-2xl border border-slate-200 hover:border-primary/40 transition-all cursor-pointer shadow-sm hover:shadow-md">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center mb-2 group-hover:bg-orange-500 transition-colors">
                                <span className="material-symbols-outlined text-orange-600 text-sm group-hover:text-white">quick_reference_all</span>
                            </div>
                            <h4 className="font-bold text-sm mb-1 text-slate-800">{t('aiChat.analyzeCandidate') || 'Đánh giá ứng viên'}</h4>
                            <p className="text-xs text-slate-500">{t('aiChat.analyzeCandidateDesc') || 'Phân tích độ phù hợp của ứng viên.'}</p>
                        </div>
                    )}
                </div>

                <div className="mt-8">
                    <div className="bg-linear-to-br from-slate-800 to-slate-900 p-6 rounded-3xl border border-slate-700 text-white shadow-lg">
                        <h4 className="font-bold text-sm mb-2 text-teal-400">AI Power Insight</h4>
                        <p className="text-xs text-slate-300 leading-relaxed mb-4">Mức độ tương tác của tin tuyển dụng của bạn đang cao hơn 45% so với tuần trước.</p>
                        <button className="text-xs font-bold text-teal-400 flex items-center gap-1 hover:gap-2 transition-all">
                            Xem báo cáo chi tiết <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Thêm chút CSS cho thanh cuộn (Scrollbar) */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

                /* Markdown Basic Styling */
                .prose h1 { font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem; color: #0f172a; }
                .prose h2 { font-size: 1.1rem; font-weight: 700; margin-top: 1rem; margin-bottom: 0.5rem; color: #1e293b; }
                .prose h3 { font-size: 1rem; font-weight: 700; margin-top: 0.75rem; margin-bottom: 0.25rem; }
                .prose p { margin-bottom: 0.75rem; line-height: 1.6; }
                .prose ul { list-style-type: disc; margin-left: 1.25rem; margin-bottom: 0.75rem; }
                .prose li { margin-bottom: 0.25rem; }
                .prose strong { font-weight: 700; color: #0f172a; }
            `}</style>

            {/* CONFIRM DIALOG MODAL */}
            {confirmDialog.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up-fade border border-slate-100">
                        <div className="p-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${confirmDialog.isDanger ? 'bg-red-50 text-red-500' : 'bg-primary-container/20 text-primary'}`}>
                                <span className="material-symbols-outlined text-3xl">
                                    {confirmDialog.isDanger ? 'warning' : 'help'}
                                </span>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2">{confirmDialog.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">{confirmDialog.message}</p>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                            <button
                                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => {
                                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                    if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                                }}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-colors ${
                                    confirmDialog.isDanger 
                                        ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                                        : 'bg-primary hover:bg-primary-dark shadow-primary/20'
                                }`}
                            >
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AIChat;
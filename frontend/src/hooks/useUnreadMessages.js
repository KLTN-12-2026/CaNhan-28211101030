import { useState, useEffect, useCallback } from 'react';
import api from '../api';

export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    const token = sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
    if (!token) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await api.get('messages/unread_count/');
      setUnreadCount(res.data?.unread_count || 0);
    } catch (err) {
      // Bỏ qua lỗi nếu chưa đăng nhập hoặc mất kết nối tạm thời
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();

    // Định kỳ kiểm tra tin nhắn mới mỗi 6 giây
    const interval = setInterval(fetchUnreadCount, 6000);

    const handleFocus = () => fetchUnreadCount();
    const handleRead = () => fetchUnreadCount();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('messagesRead', handleRead);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('messagesRead', handleRead);
    };
  }, [fetchUnreadCount]);

  return unreadCount;
}

export default useUnreadMessages;

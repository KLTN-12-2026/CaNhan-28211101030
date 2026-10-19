import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api/',
    timeout: 120000,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Interceptor: Tự động gắn Token vào mọi request gửi đi
api.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor: Xử lý lỗi từ Server trả về (Tự động Logout khi Token lỗi)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error("Token invalid or expired. Logging out...");
            sessionStorage.clear();
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default api;
import { useQuery } from '@tanstack/react-query';
import api from '../../api';

export const fetchFreelancerData = async (userId) => {
    // Chúng ta fetch song song profile và notifications để tăng tốc độ
    const [profileRes, notifRes] = await Promise.all([
        api.get("freelancers/"),
        api.get("notifications/").catch(() => ({ data: { results: [] } }))
    ]);

    const allProfiles = profileRes.data.results || profileRes.data;
    const myProfile = allProfiles.find(p => String(p.user) === String(userId));
    const notifs = notifRes.data.results || notifRes.data || [];

    if (!myProfile) {
        throw new Error("Không tìm thấy hồ sơ cá nhân.");
    }

    return { profile: myProfile, notifications: notifs };
};

export const useFreelancerProfile = (userId, options = {}) => {
    return useQuery({
        queryKey: ['freelancerProfile', userId],
        queryFn: () => fetchFreelancerData(userId),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        ...options,
    });
};

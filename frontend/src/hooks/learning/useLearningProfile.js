import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';

export const fetchProfile = async () => {
    // Return early if there's no auth token (if that applies)
    const profRes = await api.get('freelancers/me/');
    return profRes.data;
};

export const useLearningProfile = (options = {}) => {
    return useQuery({
        queryKey: ['learningProfile'],
        queryFn: fetchProfile,
        staleTime: 5 * 60 * 1000, // 5 minutes
        ...options,
    });
};

export const useUpdateProfile = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async ({ id, updateData }) => {
            const res = await api.patch(`freelancers/${id}/`, updateData);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['learningProfile']);
        }
    });
};

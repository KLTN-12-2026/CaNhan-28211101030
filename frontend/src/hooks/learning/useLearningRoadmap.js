import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';

export const useLearningRoadmap = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (careerGoal) => {
            const response = await api.post('ai-analyze-cv/', { career_goal: careerGoal });
            return response.data;
        },
        onSuccess: (data) => {
            // Cập nhật cache profile nếu API trả về profile mới hoặc update lại profile
            // queryClient.invalidateQueries(['learningProfile']);
            return data;
        }
    });
};

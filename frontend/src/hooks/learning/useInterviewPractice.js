import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';

// 1. Fetch Practice History
export const usePracticeHistory = (options = {}) => {
    return useQuery({
        queryKey: ['practiceHistory'],
        queryFn: async () => {
            const res = await api.get('ai-engine/practice-history/');
            return res.data;
        },
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};

// 2. Generate Interview Kit
export const useGenerateInterview = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload) => {
            const response = await api.post("ai-engine/generate-interview/", payload);
            return response.data;
        },
        onSuccess: () => {
            // Có thể cần invalidate profile để reload lại interviewData nếu nó lưu trong profile
            queryClient.invalidateQueries(['learningProfile']);
        }
    });
};

// 3. Save Interview Question
export const useSaveInterviewQuestion = () => {
    return useMutation({
        mutationFn: async (questionId) => {
            const res = await api.post('ai-engine/save-interview-question/', { question_id: questionId });
            return { data: res.data, questionId };
        }
    });
};

// 4. Review Interview Answer
export const useReviewInterviewAnswer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload) => {
            // payload: { question_id, user_answer }
            const response = await api.post('ai-engine/review-answer/', payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['practiceHistory']);
        }
    });
};

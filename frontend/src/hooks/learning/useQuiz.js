import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';

export const useQuiz = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload) => {
            // payload: { skill_name: selectedSkillToTest }
            const response = await api.post('ai-engine/generate-quiz/', payload);
            return response.data;
        },
        // We might not need onSuccess invalidation here unless the quiz affects the profile score directly
    });
};

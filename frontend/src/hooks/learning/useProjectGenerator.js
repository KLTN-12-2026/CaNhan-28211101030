import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';

export const useProjectGenerator = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload) => {
            // payload: { focus_area: selectedProjectArea, current_level: profile?.experience_level || "Junior" }
            const response = await api.post('ai-engine/generate-project/', payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['learningProfile']);
        }
    });
};

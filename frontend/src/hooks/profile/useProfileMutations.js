import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';

export const useUpdateProfile = (userId) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ profileId, updateData, isFormData = false }) => {
            const config = isFormData ? { headers: { "Content-Type": "multipart/form-data" } } : {};
            const res = await api.patch(`freelancers/${profileId}/`, updateData, config);
            return res.data;
        },
        onSuccess: () => {
            if (userId) queryClient.invalidateQueries(['freelancerProfile', userId]);
            // Also invalidate learningProfile if it exists since they share the same backend data
            queryClient.invalidateQueries(['learningProfile']);
        }
    });
};

export const useExtractCV = (userId) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ profileId, formData }) => {
            if (formData) {
                await api.patch(`freelancers/${profileId}/`, formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
            }
            const res = await api.post(`freelancers/${profileId}/extract_cv/`);
            return res.data;
        },
        onSuccess: () => {
            if (userId) queryClient.invalidateQueries(['freelancerProfile', userId]);
        }
    });
};

export const useAutofillCV = (userId) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ profileId }) => {
            const res = await api.post(`freelancers/${profileId}/autofill_cv/`);
            return res.data;
        },
        onSuccess: () => {
            if (userId) queryClient.invalidateQueries(['freelancerProfile', userId]);
        }
    });
};

export const useGenerateBio = (userId) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ profileId }) => {
            const res = await api.post(`freelancers/${profileId}/generate_bio/`);
            return res.data;
        },
        onSuccess: () => {
            if (userId) queryClient.invalidateQueries(['freelancerProfile', userId]);
        }
    });
};

export const useSuggestSkills = (userId) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ profileId }) => {
            const res = await api.post(`freelancers/${profileId}/suggest_skills/`);
            return res.data;
        },
        onSuccess: () => {
            if (userId) queryClient.invalidateQueries(['freelancerProfile', userId]);
        }
    });
};

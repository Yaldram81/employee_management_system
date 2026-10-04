'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface ApiQueryOptions {
  endpoint: string;
  enabled?: boolean;
  staleTime?: number;
}

/**
 * A custom hook that combines React Query with the EMS api client.
 * Use this for GET requests that need caching.
 */
export function useApiQuery<T>({ endpoint, enabled = true, staleTime }: ApiQueryOptions) {
  return useQuery<T>({
    queryKey: ['api', endpoint],
    queryFn: async () => {
      return await api.get<T>(endpoint);
    },
    enabled,
    staleTime,
  });
}

/**
 * A custom hook for API mutations (POST, PUT, PATCH, DELETE).
 * Automatically invalidates related queries on success.
 */
export function useApiMutation<TData, TVariables>({
  endpoint,
  method = 'POST',
  invalidateKeys,
}: {
  endpoint: string;
  method?: string;
  invalidateKeys?: string[];
}) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      switch (method.toUpperCase()) {
        case 'POST':
          return await api.post<TData>(endpoint, variables);
        case 'PUT':
          return await api.put<TData>(endpoint, variables);
        case 'PATCH':
          return await api.patch<TData>(endpoint, variables);
        case 'DELETE':
          return await api.delete<TData>(endpoint);
        default:
          return await api.post<TData>(endpoint, variables);
      }
    },
    onSuccess: () => {
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: ['api', key] });
        });
      }
    },
  });
}

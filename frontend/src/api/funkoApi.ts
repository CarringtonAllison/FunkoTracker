import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiDataResponse, RefreshResponse } from '../types/funko';

const api = axios.create({ baseURL: '/api' });

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchData(): Promise<ApiDataResponse> {
  const { data } = await api.get<ApiDataResponse>('/data');
  return data;
}

async function triggerRefresh(): Promise<RefreshResponse> {
  const { data } = await api.post<RefreshResponse>('/refresh');
  return data;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useFunkoData() {
  return useQuery({
    queryKey: ['funkoData'],
    queryFn: fetchData,
    staleTime: 60_000, // consider data fresh for 1 minute
  });
}

export function useRefresh() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: triggerRefresh,
    onSuccess: () => {
      // Re-fetch all data after a successful refresh
      queryClient.invalidateQueries({ queryKey: ['funkoData'] });
    },
  });
}

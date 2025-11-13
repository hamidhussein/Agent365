import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAgentStore } from '@/lib/store';
import type { Agent, AgentFilters, PaginatedResponse } from '@/lib/types';
import { useEffect } from 'react';

export function useAgents(filters?: AgentFilters) {
  const { setAgents, setLoading, setError } = useAgentStore();

  const query = useQuery<
    PaginatedResponse<Agent>,
    Error,
    PaginatedResponse<Agent>,
    ['agents', AgentFilters | undefined]
  >({
    queryKey: ['agents', filters],
    queryFn: async () => {
      setLoading(true);
      const response = await api.agents.list(filters);
      return response.data;
    },
  });

  useEffect(() => {
    if (query.data) {
      setAgents(query.data.data);
      setLoading(false);
    }
  }, [query.data, setAgents, setLoading]);

  useEffect(() => {
    if (query.error) {
      setError(query.error.message);
      setLoading(false);
    }
  }, [query.error, setError, setLoading]);

  return query;
}

export function useAgent(agentId?: string) {
  return useQuery({
    queryKey: ['agent', agentId] as const,
    queryFn: async () => {
      if (!agentId) {
        throw new Error('Agent ID is required');
      }
      const response = await api.agents.get(agentId);
      return response.data;
    },
    enabled: Boolean(agentId),
  });
}

export function useExecuteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['execute-agent'],
    mutationFn: async ({
      agentId,
      inputs,
    }: {
      agentId: string;
      inputs: Record<string, unknown>;
    }) => {
      const response = await api.agents.execute(agentId, inputs);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] });
    },
  });
}

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAgentStore } from '@/lib/store';
import type { AgentFilters } from '@/lib/types';

export function useAgents(filters?: AgentFilters) {
  const { setAgents, setLoading, setError } = useAgentStore();

  return useQuery({
    queryKey: ['agents', filters] as const,
    queryFn: async () => {
      setLoading(true);
      const response = await api.agents.list(filters);
      return response.data;
    },
    onSuccess: (payload) => {
      setAgents(payload.data);
      setLoading(false);
    },
    onError: (error: unknown) => {
      setError(
        error instanceof Error ? error.message : 'Failed to load agents.'
      );
      setLoading(false);
    },
  });
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

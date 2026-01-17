import { Agent, AgentPayload, AgentSuggestPayload, AgentSuggestResponse, AssistModelResponse, AssistModelUpdate, LLMProviderConfig, PlatformSettings, UserProfile } from './types';

const defaultBase = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '') + '/creator-studio'
  : '/creator-studio';
export const API_BASE = import.meta.env.VITE_CREATOR_STUDIO_API_BASE_URL || defaultBase;
const TOKEN_KEY = 'auth_token';

const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

const setStoredToken = (token: string, _remember: boolean) => {
  localStorage.setItem(TOKEN_KEY, token);
};

const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

const apiFetch = async (path: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const text = await response.text();
    let message = text || 'Request failed';
    try {
      const data = JSON.parse(text);
      if (data && data.detail) {
        message = data.detail;
      }
    } catch {
      // Ignore parse errors.
    }
    throw new Error(message);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
};

export const authApi = {
  async me() {
    return apiFetch('/api/me') as Promise<UserProfile>;
  },
  setToken: setStoredToken,
  clearToken: clearStoredToken,
  getToken: getStoredToken
};

export const agentsApi = {
  async list() {
    return apiFetch('/api/agents') as Promise<Agent[]>;
  },
  async create(payload: AgentPayload) {
    return apiFetch('/api/agents', {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<Agent>;
  },
  async update(id: string, payload: AgentPayload) {
    return apiFetch(`/api/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }) as Promise<Agent>;
  },
  async remove(id: string) {
    return apiFetch(`/api/agents/${id}`, {
      method: 'DELETE'
    }) as Promise<{ ok: boolean }>;
  },
  async removeAll() {
    return apiFetch('/api/agents', {
      method: 'DELETE'
    }) as Promise<{ ok: boolean }>;
  },
  async uploadFiles(agentId: string, files: File[]) {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    return apiFetch(`/api/agents/${agentId}/files`, {
      method: 'POST',
      body: form
    }) as Promise<Agent['files']>;
  },
  async deleteFile(agentId: string, fileId: string) {
    return apiFetch(`/api/agents/${agentId}/files/${fileId}`, {
      method: 'DELETE'
    }) as Promise<{ ok: boolean }>;
  },
  async suggest(payload: AgentSuggestPayload) {
    return apiFetch('/api/agents/suggest', {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<AgentSuggestResponse>;
  }
};


export const adminApi = {
  async listLLMConfigs() {
    return apiFetch('/api/admin/llm-configs') as Promise<LLMProviderConfig[]>;
  },
  async updateLLMConfig(id: string, updates: Partial<LLMProviderConfig>) {
    return apiFetch(`/api/admin/llm-configs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }) as Promise<LLMProviderConfig>;
  },
  async getAssistModel() {
    return apiFetch('/api/admin/assist-model') as Promise<AssistModelResponse>;
  },
  async updateAssistModel(payload: AssistModelUpdate) {
    return apiFetch('/api/admin/assist-model', {
      method: 'PUT',
      body: JSON.stringify(payload)
    }) as Promise<AssistModelResponse>;
  },
  async getPlatformSettings() {
    return apiFetch('/api/admin/settings') as Promise<PlatformSettings>;
  },
  async updatePlatformSettings(payload: PlatformSettings) {
    return apiFetch('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<{ message: string }>;
  }
};

export const publicApi = {
  async listPublicAgents() {
    return apiFetch('/api/public/agents') as Promise<Agent[]>;
  },
  async getCredits(guestId: string) {
    const encoded = encodeURIComponent(guestId);
    return apiFetch(`/api/public/credits?guestId=${encoded}`) as Promise<{ credits: number }>;
  },
  async purchaseCredits(guestId: string, amount: number) {
    return apiFetch('/api/public/credits/purchase', {
      method: 'POST',
      body: JSON.stringify({ guestId, amount })
    }) as Promise<{ credits: number }>;
  },
  async extractFileText(file: File) {
    const form = new FormData();
    form.append('file', file);
    return apiFetch('/api/files/extract', {
      method: 'POST',
      body: form
    }) as Promise<{ text: string }>;
  }
};

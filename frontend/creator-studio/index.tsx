import { useEffect, useState } from 'react';
import { ViewState, Agent, LLMProviderConfig, AgentPayload } from './types';
import { DEFAULT_LLM_CONFIGS } from './constants';
import { AuthScreen } from './components/auth/AuthScreen';
import { Marketplace } from './components/marketplace/Marketplace';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Dashboard } from './components/dashboard/Dashboard';
import { AgentBuilder } from './components/agent/AgentBuilder';
import { ChatInterface } from './components/chat/ChatInterface';
import { adminApi, agentsApi, publicApi } from './api';
import { useAuthStore } from '@/lib/store';
import { addAgent, updateAgent as updateAgentInList, removeAgent } from './lib/agentStore';

const CreatorStudioApp = ({ initialView }: { initialView?: string }) => {
  const { user: mainUser, isAuthenticated } = useAuthStore();

  const getGuestId = () => {
    const stored = localStorage.getItem('agentgrid_guest_id');
    if (stored) return stored;
    let nextId = '';
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      nextId = crypto.randomUUID();
    } else {
      nextId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
    localStorage.setItem('agentgrid_guest_id', nextId);
    return nextId;
  };

  const [view, setView] = useState<ViewState>((initialView as ViewState) || (isAuthenticated ? (mainUser?.role === 'admin' ? 'admin-dashboard' : 'dashboard') : 'auth'));
  const [agents, setAgents] = useState<Agent[]>([]);
  const authError = null;

  const [llmConfigs, setLlmConfigs] = useState<LLMProviderConfig[]>(DEFAULT_LLM_CONFIGS);

  const [assistModel, setAssistModel] = useState<string | null>(null);

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [publicAgents, setPublicAgents] = useState<Agent[]>([]);
  const [guestId] = useState<string>(getGuestId());
  const [guestCredits, setGuestCredits] = useState(0);

  const loadAgents = async () => {
    const list = await agentsApi.list();
    setAgents(list);
  };

  const loadPublicAgents = async () => {
    const list = await publicApi.listPublicAgents();
    setPublicAgents(list);
  };

  const loadGuestCredits = async () => {
    const result = await publicApi.getCredits(guestId);
    setGuestCredits(result.credits);
  };

  const handleBuyCredits = async (amount: number) => {
    await publicApi.purchaseCredits(guestId, amount);
    await loadGuestCredits();
  };

  const loadAdminConfigs = async () => {
    const configs = await adminApi.listLLMConfigs();
    setLlmConfigs(configs);
  };

  const loadAssistModel = async () => {
    const result = await adminApi.getAssistModel();
    setAssistModel(result.model);
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (!isAuthenticated) {
        setView('auth');
        return;
      }

      // If initialView is specifically provided (e.g. 'admin-dashboard' from Settings tab), use it.
      // Otherwise, default to dashboard.
      if (initialView) {
        setView(initialView as ViewState);
        if (initialView === 'admin-dashboard') {
          await loadAdminConfigs();
          await loadAssistModel();
        } else {
          await loadAgents();
        }
        return;
      }

      try {
        // Default behavior: Admins and Creators both see their agents first
        setView('dashboard');
        await loadAgents();
        
        // Pre-load admin stuff if user is admin, just in case they switch
        if (mainUser?.role === 'admin') {
          await loadAdminConfigs();
          await loadAssistModel();
        }
      } catch (error) {
        console.error('Creator Studio bootstrap failed:', error);
      }
    };
    bootstrap();
  }, [isAuthenticated, mainUser, initialView]);

  // authApi methods removed as they are no longer used with unified auth.


  const handleCreateAgent = async (payload: AgentPayload, newFiles: File[], removedFileIds: string[] = []) => {

    void removedFileIds;
    try {
      const created = await agentsApi.create(payload);
      setAgents(prev => addAgent(prev, created));
      if (newFiles.length > 0) {
        await agentsApi.uploadFiles(created.id, newFiles);
        await loadAgents();
      }
      setView('dashboard');
    } catch (error: any) {
      alert(error?.message || 'Unable to create agent.');
    }
  };

  const handleUpdateAgent = async (
    agentId: string,
    payload: AgentPayload,
    newFiles: File[],
    removedFileIds: string[]
  ) => {
    try {
      const updated = await agentsApi.update(agentId, payload);
      setAgents(prev => updateAgentInList(prev, updated));
      for (const fileId of removedFileIds) {
        await agentsApi.deleteFile(agentId, fileId);
      }
      if (newFiles.length > 0) {
        await agentsApi.uploadFiles(agentId, newFiles);
      }
      await loadAgents();
      setEditingAgent(null);
      setView('dashboard');
    } catch (error: any) {
      alert(error?.message || 'Unable to update agent.');
    }
  };

  const handleDeleteAgent = async (id: string) => {
    try {
      await agentsApi.remove(id);
      setAgents(prev => removeAgent(prev, id));
    } catch (error: any) {
      alert(error?.message || 'Unable to delete agent.');
    }
  };

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setView('chat');
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setView('edit-agent');
  };


  const handleUpdateLLMConfig = async (id: string, updates: Partial<LLMProviderConfig>) => {
    try {
      const updated = await adminApi.updateLLMConfig(id, updates);
      setLlmConfigs(prev => prev.map(c => c.id === id ? updated : c));
    } catch (error: any) {
      alert(error?.message || 'Unable to update config.');
    }
  };

  const handleUpdateAssistModel = async (modelId: string) => {
    try {
      const updated = await adminApi.updateAssistModel({ model: modelId });
      setAssistModel(updated.model);
    } catch (error: any) {
      alert(error?.message || 'Unable to update AI Assist model.');
    }
  };

  const handleSaveLLMConfig = async () => {
    try {
      await loadAdminConfigs();
      await loadAssistModel();
      alert('Settings saved.');
    } catch (error: any) {
      alert(error?.message || 'Unable to refresh configs.');
    }
  };

  const handleBrowseMarketplace = async () => {
    setView('marketplace');
    await loadPublicAgents();
    await loadGuestCredits();
  };

  const handleSelectPublicAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setView('public-chat');
  };

  return (
    <>
      {view === 'auth' && (
        <AuthScreen 
          onAuth={() => {}} // Placeholder as we use Marketplace login now
          error={authError} 
          onBrowseMarketplace={handleBrowseMarketplace} 
        />
      )}

      {view === 'admin-dashboard' && mainUser && (
        <AdminDashboard
          llmConfigs={llmConfigs}
          assistModel={assistModel}
          onUpdateAssistModel={handleUpdateAssistModel}
          onUpdateConfig={handleUpdateLLMConfig}
          onSave={handleSaveLLMConfig}
        />
      )}

      {view === 'marketplace' && (
        <Marketplace
          agents={publicAgents}
          credits={guestCredits}
          onSelectAgent={handleSelectPublicAgent}
          onBuyCredits={handleBuyCredits}
          onRefresh={loadPublicAgents}
          onBack={() => setView('auth')}
        />
      )}

      {view === 'dashboard' && mainUser && (
        <Dashboard
          agents={agents}
          onCreateClick={() => {
            setEditingAgent(null);
            setView('create-agent');
          }}
          onSelectAgent={handleSelectAgent}
          onEditAgent={handleEditAgent}
          onDeleteAgent={handleDeleteAgent}
        />
      )}

      {view === 'create-agent' && (
        <div className="min-h-screen bg-slate-900 pt-8">
          <AgentBuilder
            onCancel={() => setView('dashboard')}
            onSave={handleCreateAgent}
          />
        </div>
      )}

      {view === 'edit-agent' && editingAgent && (
        <div className="min-h-screen bg-slate-900 pt-8">
          <AgentBuilder
            initialData={editingAgent}
            onCancel={() => {
              setEditingAgent(null);
              setView('dashboard');
            }}
            onSave={(payload, newFiles, removedFileIds) =>
              handleUpdateAgent(editingAgent.id, payload, newFiles, removedFileIds)
            }
          />
        </div>
      )}

      {view === 'public-chat' && selectedAgent && (
        <ChatInterface
          agent={selectedAgent}
          onBack={() => {
            setSelectedAgent(null);
            setView('marketplace');
          }}
          publicMode
          guestId={guestId}
          credits={guestCredits}
          onBuyCredits={handleBuyCredits}
          onCreditsRefresh={loadGuestCredits}
        />
      )}

      {view === 'chat' && selectedAgent && (
        <ChatInterface
          agent={selectedAgent}
          onBack={() => {
            setSelectedAgent(null);
            setView('dashboard');
          }}
        />
      )}
    </>
  );
};

export default CreatorStudioApp;

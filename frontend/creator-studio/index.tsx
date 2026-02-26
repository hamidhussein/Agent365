import { useEffect, useState } from 'react';
import { ViewState, Agent, LLMProviderConfig, AgentPayload, PlatformSettings } from './types';
import { DEFAULT_LLM_CONFIGS } from './constants';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Dashboard } from './components/dashboard/Dashboard';
import { AgentBuilder } from './components/agent/AgentBuilder';
import { ChatInterface } from './components/chat/ChatInterface';
import { AgentManagePage } from './components/dashboard/AgentManagePage';
import { adminApi, agentsApi } from './api';
import { useAuthStore } from '@/lib/store';
import { useAuth } from '@/lib/hooks/useAuth';
import { addAgent, updateAgent as updateAgentInList, removeAgent } from './lib/agentStore';

const CreatorStudioApp = ({ initialView }: { initialView?: string }) => {
  const { user: mainUser, isAuthenticated } = useAuthStore();
  const { signOut } = useAuth();
  
  // Initialize view from URL if possible
  const getInitialStateFromUrl = () => {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean); // path looks like ['studio', 'chat', 'agent-id']
    
    if (parts[1] === 'admin') return { view: 'admin-dashboard' as ViewState, id: null };
    if (parts[1] === 'chat' && parts[2]) return { view: 'chat' as ViewState, id: parts[2] };
    if (parts[1] === 'create') return { view: 'create-agent' as ViewState, id: null };
    if (parts[1] === 'edit' && parts[2]) return { view: 'edit-agent' as ViewState, id: parts[2] };
    if (parts[1] === 'agent' && parts[2]) return { view: 'agent-manage' as ViewState, id: parts[2] };
    
    return { 
      view: (initialView as ViewState) || (mainUser?.role === 'admin' ? 'admin-dashboard' : 'dashboard'), 
      id: null 
    };
  };

  const initialState = getInitialStateFromUrl();
  const [view, setView] = useState<ViewState>(initialState.view);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [llmConfigs, setLlmConfigs] = useState<LLMProviderConfig[]>(DEFAULT_LLM_CONFIGS);
  const [assistModel, setAssistModel] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [managingAgent, setManagingAgent] = useState<Agent | null>(null);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({});

  const loadAgents = async () => {
    const list = await agentsApi.list();
    setAgents(list);
    
    // After loading agents, if we are in a detail view, resolve the agent
    const { id, view: currentView } = getInitialStateFromUrl();
    if (id) {
      const target = list.find(a => a.id === id);
      if (target) {
        if (currentView === 'chat') setSelectedAgent(target);
        if (currentView === 'edit-agent') setEditingAgent(target);
        if (currentView === 'agent-manage') setManagingAgent(target);
      }
    }
  };

  // Sync URL with view state
  useEffect(() => {
    const baseUrl = '/studio';
    let path = baseUrl;
    
    if (view === 'admin-dashboard') path = `${baseUrl}/admin`;
    else if (view === 'chat' && selectedAgent) path = `${baseUrl}/chat/${selectedAgent.id}`;
    else if (view === 'create-agent') path = `${baseUrl}/create`;
    else if (view === 'edit-agent' && editingAgent) path = `${baseUrl}/edit/${editingAgent.id}`;
    else if (view === 'agent-manage' && managingAgent) path = `${baseUrl}/agent/${managingAgent.id}`;
    else if (view === 'dashboard') path = baseUrl;

    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  }, [view, selectedAgent, editingAgent, managingAgent]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const { view: nextView, id } = getInitialStateFromUrl();
      setView(nextView);
      if (!id) {
        setSelectedAgent(null);
        setEditingAgent(null);
        setManagingAgent(null);
      } else if (agents.length > 0) {
        const target = agents.find(a => a.id === id);
        if (target) {
          if (nextView === 'chat') setSelectedAgent(target);
          if (nextView === 'edit-agent') setEditingAgent(target);
          if (nextView === 'agent-manage') setManagingAgent(target);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [agents]);

  const loadAdminConfigs = async () => {
    const configs = await adminApi.listLLMConfigs();
    setLlmConfigs(configs);
  };

  const loadAssistModel = async () => {
    const result = await adminApi.getAssistModel();
    setAssistModel(result.model);
  };

  const loadPlatformSettings = async () => {
    const settings = await adminApi.getPlatformSettings();
    setPlatformSettings(settings);
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (!isAuthenticated) {
        return;
      }
      
      const { view: urlView } = getInitialStateFromUrl();
      if (initialView) {
        setView(initialView as ViewState);
      } else {
        setView(urlView);
      }

      if (view === 'admin-dashboard' || (mainUser?.role === 'admin' && view === 'dashboard')) {
        await loadAdminConfigs();
        await loadAssistModel();
        await loadPlatformSettings();
      }
      await loadAgents();
    };

    bootstrap().catch((error) => {
      console.error('Creator Studio bootstrap failed:', error);
    });
  }, [isAuthenticated, mainUser, initialView]);

  const handleCreateAgent = async (payload: AgentPayload, newFiles: File[], removedFileIds: string[] = []) => {
    void removedFileIds;
    try {
      const created = await agentsApi.create(payload);
      setAgents((prev) => addAgent(prev, created));
      if (newFiles.length > 0) {
        await agentsApi.uploadFiles(created.id, newFiles);
        await loadAgents();
      }
      setEditingAgent(created);
      setView('edit-agent');
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
      setAgents((prev) => updateAgentInList(prev, updated));
      for (const fileId of removedFileIds) {
        await agentsApi.deleteFile(agentId, fileId);
      }
      if (newFiles.length > 0) {
        await agentsApi.uploadFiles(agentId, newFiles);
      }
      const refreshedList = await agentsApi.list();
      setAgents(refreshedList);
      const updatedAgent = refreshedList.find(a => a.id === agentId);
      if (updatedAgent) {
        setEditingAgent(updatedAgent);
        setView('edit-agent'); // Added to explicitly set the view
      }
    } catch (error: any) {
      alert(error?.message || 'Unable to update agent.');
    }
  };

  const handleDeleteAgent = async (id: string) => {
    try {
      await agentsApi.remove(id);
      setAgents((prev) => removeAgent(prev, id));
    } catch (error: any) {
      alert(error?.message || 'Unable to delete agent.');
    }
  };

  const handleSelectAgent = (agent: Agent) => {
    setManagingAgent(agent);
    setView('agent-manage');
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setView('edit-agent');
  };

  const handleUpdateLLMConfig = async (id: string, updates: Partial<LLMProviderConfig>) => {
    const updated = await adminApi.updateLLMConfig(id, updates);
    setLlmConfigs((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  const handleUpdateAssistModel = async (modelId: string) => {
    const updated = await adminApi.updateAssistModel({ model: modelId });
    setAssistModel(updated.model);
  };

  const handleUpdatePlatformSettings = async (updates: Partial<PlatformSettings>) => {
    const next = { ...platformSettings, ...updates };
    setPlatformSettings(next);
    await adminApi.updatePlatformSettings(next);
  };

  const handleSaveLLMConfig = async () => {
    await loadAdminConfigs();
    await loadAssistModel();
    await loadPlatformSettings();
    alert('Settings saved.');
  };

  return (
    <div className="relative min-h-screen">
      {view === 'admin-dashboard' && mainUser && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <AdminDashboard
            llmConfigs={llmConfigs}
            assistModel={assistModel}
            onUpdateAssistModel={handleUpdateAssistModel}
            onUpdateConfig={handleUpdateLLMConfig}
            onSave={handleSaveLLMConfig}
            platformSettings={platformSettings}
            onUpdatePlatformSettings={handleUpdatePlatformSettings}
            onLogout={() => void signOut()}
          />
        </div>
      )}

      {view === 'dashboard' && mainUser && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Dashboard
            agents={agents}
            onCreateClick={() => {
              setEditingAgent(null);
              setView('create-agent');
            }}
            onSelectAgent={handleSelectAgent}
            onEditAgent={handleEditAgent}
            onDeleteAgent={handleDeleteAgent}
            onLogout={() => void signOut()}
          />
        </div>
      )}

      {view === 'create-agent' && (
        <div className="fixed inset-0 z-50 animate-in fade-in slide-in-from-right-4 duration-500 bg-background">
          <AgentBuilder onCancel={() => setView('dashboard')} onSave={handleCreateAgent} />
        </div>
      )}

      {view === 'edit-agent' && editingAgent && (
        <div className="fixed inset-0 z-50 animate-in fade-in slide-in-from-right-4 duration-500 bg-background">
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

      {view === 'chat' && selectedAgent && (
        <div className="fixed inset-0 z-50 animate-in fade-in zoom-in-95 duration-500 bg-background">
          <ChatInterface
            agent={selectedAgent}
            onBack={() => {
              setSelectedAgent(null);
              // Go back to the manage page for this agent if we came from there
              if (managingAgent?.id === selectedAgent.id) {
                setView('agent-manage');
              } else {
                setView('dashboard');
              }
            }}
          />
        </div>
      )}

      {view === 'agent-manage' && managingAgent && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <AgentManagePage
            agent={managingAgent}
            onBack={() => {
              setManagingAgent(null);
              setView('dashboard');
            }}
            onOpenChat={(agent) => {
              setSelectedAgent(agent);
              setView('chat');
            }}
            onSave={(payload, newFiles, removedFileIds) =>
              handleUpdateAgent(managingAgent.id, payload, newFiles, removedFileIds).then(() => {
                const updated = agents.find(a => a.id === managingAgent.id);
                if (updated) setManagingAgent(updated);
              })
            }
            onDelete={(id) => {
              handleDeleteAgent(id);
              setManagingAgent(null);
              setView('dashboard');
            }}
            onOpenBuilder={(agent) => {
              setEditingAgent(agent);
              setView('edit-agent');
            }}
          />
        </div>
      )}
    </div>
  );
};

export default CreatorStudioApp;

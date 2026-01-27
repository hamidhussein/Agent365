import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Bot, Cpu, Settings, FileText, Upload, X, AlertTriangle, Sparkles, Globe, Save, Rocket } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, TextArea } from '../ui/Input';
import { Agent, AgentInput, AgentPayload, KnowledgeFile, AgentActionResponse } from '../../types';
import { COLORS } from '../../constants';
import { BuilderChat, Message } from './BuilderChat';
import { PreviewChat } from './PreviewChat';
import { AgentDebugger, DebugLog } from './AgentDebugger';
import { ActionsConfig } from './ActionsConfig';
import { agentsApi } from '../../api';

export const AgentBuilder = ({
  onCancel,
  onSave,
  initialData
}: {
  onCancel: () => void,
  onSave: (payload: AgentPayload, newFiles: File[], removedFileIds: string[]) => void,
  initialData?: Agent
}) => {
  // State from original AgentBuilder
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [instruction, setInstruction] = useState(initialData?.instruction || '');
  const [color, setColor] = useState(initialData?.color || COLORS[0]);
  const [inputs] = useState<AgentInput[]>(initialData?.inputs || []);
  const [isPublic, setIsPublic] = useState(initialData?.isPublic ?? false);
  const [creditsPerRun, setCreditsPerRun] = useState(initialData?.creditsPerRun ?? 1);
  const [allowReviews, setAllowReviews] = useState(initialData?.allow_reviews || false);
  const [reviewCost, setReviewCost] = useState(initialData?.review_cost || 5);
  const [enabledCapabilities, setEnabledCapabilities] = useState(initialData?.enabledCapabilities || {
    codeExecution: initialData?.capabilities?.includes('code_execution') || false,
    webBrowsing: initialData?.capabilities?.includes('web_search') || false,
    apiIntegrations: initialData?.capabilities?.includes('api_access') || false,
    fileHandling: initialData?.capabilities?.some(c => c === 'file_handling' || c === 'files') || false,
  });
  const [existingFiles, setExistingFiles] = useState<KnowledgeFile[]>(initialData?.files || []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [removedFileIds, setRemovedFileIds] = useState<string[]>([]);
  const [showFileWarning, setShowFileWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Power Mode State
  const [activeTab, setActiveTab] = useState<'create' | 'configure'>('create'); // 'create' = Architect, 'configure' = Manual
  const [rightPanelTab, setRightPanelTab] = useState<'preview' | 'debug'>('preview');
  const [architectMessages, setArchitectMessages] = useState<Message[]>([
      { 
        role: 'model', 
        content: "Hi! I'm your Agent Architect. What kind of agent would you like to build today?" 
      }
  ]);
  const [actions, setActions] = useState<AgentActionResponse[]>(initialData?.creator_studio_actions || []);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);

  useEffect(() => {
    if (initialData?.id) {
       agentsApi.getActions(initialData.id).then(setActions).catch(console.error);
    }
  }, [initialData?.id]);

  useEffect(() => {
    setShowFileWarning(newFiles.some(file => file.type === 'application/pdf'));
  }, [newFiles]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const incoming = Array.from(e.target.files);
      setNewFiles(prev => [...prev, ...incoming]);
    }
    e.target.value = '';
  };

  const handleRemoveExistingFile = (file: KnowledgeFile) => {
    setExistingFiles(prev => prev.filter(item => item.id !== file.id));
    setRemovedFileIds(prev => [...prev, file.id]);
  };

  const handleArchitectUpdate = (updates: Partial<AgentPayload>) => {
    if (updates.name) setName(updates.name);
    if (updates.description) setDescription(updates.description);
    if (updates.instruction) setInstruction(updates.instruction);
    
    // Add debug thought
    if (updates.instruction || updates.name) {
       addDebugLog('thought', `Architect updated agent definition.`);
    }
  };
  
  const addDebugLog = (type: DebugLog['type'], content: string, metadata?: any) => {
      setDebugLogs(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toLocaleTimeString(),
          type,
          content,
          metadata
      }]);
  };

  const currentPayload: AgentPayload = {
    name,
    description,
    instruction,
    model: 'auto',
    color,
    isPublic,
    creditsPerRun: Math.max(1, Math.floor(creditsPerRun || 1)),
    allow_reviews: allowReviews,
    review_cost: Math.max(0, Math.floor(reviewCost || 0)),
    enabledCapabilities,
    capabilities: [
      enabledCapabilities.codeExecution ? 'code_execution' : '',
      enabledCapabilities.webBrowsing ? 'web_search' : '',
      enabledCapabilities.apiIntegrations ? 'api_access' : '',
      enabledCapabilities.fileHandling ? 'file_handling' : '',
    ].filter(Boolean),
    inputs,
    files: existingFiles.map(f => f.id)
  };

  const handleSubmit = () => {
    if (!name || !instruction) return;
    onSave(currentPayload, newFiles, removedFileIds);
  };
  
  // Tabs for the main configuration area
  const [configSection, setConfigSection] = useState<'identity' | 'behavior' | 'knowledge' | 'capabilities' | 'tools' | 'publish'>('identity');

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden font-sans">
      {/* Top Bar */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-card/80 backdrop-blur-md shrink-0 sticky top-0 z-30">
         <div className="flex items-center gap-4">
             <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={onCancel}>
                 <X size={18} />
             </Button>
             <div className="h-6 w-px bg-border" />
             <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{initialData ? 'EDITING AGENT' : 'NEW AGENT'}</span>
                 <span className="text-sm font-bold text-foreground">{name || 'Untitled Agent'}</span>
             </div>
         </div>
         
         <div className="flex bg-muted/50 p-1.5 rounded-xl border border-border/50">
             <button 
                 onClick={() => setActiveTab('create')}
                 className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'create' ? 'bg-green-600 text-white shadow-md shadow-green-600/20' : 'text-muted-foreground hover:text-foreground'}`}
             >
                 <Sparkles size={14} /> Architect
             </button>
             <button 
                 onClick={() => setActiveTab('configure')}
                 className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'configure' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
             >
                 <Settings size={14} /> Editor
             </button>
         </div>

         <div className="flex items-center gap-3">
             <Button 
                variant="outline"
                className="text-muted-foreground font-bold h-9 bg-transparent border-border hover:bg-muted" 
                onClick={onCancel}
             >
                Cancel
             </Button>
             
             <Button 
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-black shadow-lg shadow-primary/20 h-9 px-6 border-0 active:scale-[0.98] transition-all" 
                onClick={handleSubmit}
             >
                {initialData ? (
                    <span className="flex items-center gap-2"><Save size={16}/> Save Changes</span>
                ) : (
                    <span className="flex items-center gap-2"><Rocket size={16}/> Publish Agent</span>
                )}
             </Button>
         </div>
      </div>

      <div className="flex flex-1 min-h-0">
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800">
             
             {activeTab === 'create' ? (
                 <div className="flex-1 overflow-hidden flex flex-col relative">
                     <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/5 via-slate-950 to-slate-950" />
                     <div className="relative z-10 flex-1 p-6 overflow-y-auto">
                        <div className="max-w-3xl mx-auto">
                           <div className="mb-8 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl backdrop-blur-sm">
                              <h3 className="text-lg font-bold text-emerald-100 mb-2 flex items-center gap-2">
                                <Sparkles size={20} className="text-emerald-400" /> Conversational Architect
                              </h3>
                              <p className="text-sm text-emerald-200/60 leading-relaxed">
                                Tell the architect what you want to build. It will automatically suggest Name, Instructions, and Capabilities for you.
                              </p>
                           </div>
                           <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl">
                               <BuilderChat 
                                  currentState={currentPayload} 
                                  onUpdateState={handleArchitectUpdate}
                                  agentId={initialData?.id}
                                  messages={architectMessages}
                                  setMessages={setArchitectMessages}
                                />
                           </div>
                        </div>
                     </div>
                 </div>
             ) : (
                  <div className="flex-1 flex overflow-hidden">
                     {/* Sidebar Navigation */}
                     <div className="w-64 bg-card/50 flex flex-col border-r border-border backdrop-blur-sm">
                         <div className="p-4 space-y-1">
                             <button onClick={() => setConfigSection('identity')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${configSection === 'identity' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                                 <Bot size={16} /> Identity
                             </button>
                             <button onClick={() => setConfigSection('behavior')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${configSection === 'behavior' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                                 <Cpu size={16} /> Instructions
                             </button>
                             <button onClick={() => setConfigSection('knowledge')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${configSection === 'knowledge' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                                 <FileText size={16} /> Knowledge
                             </button>
                             <button onClick={() => setConfigSection('capabilities')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${configSection === 'capabilities' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                                 <Settings size={16} /> Capabilities
                             </button>
                             <button onClick={() => setConfigSection('tools')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${configSection === 'tools' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                                 <Globe size={16} /> Tools & Actions
                             </button>
                             <div className="h-px bg-border my-3 mx-3" />
                             <button onClick={() => setConfigSection('publish')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${configSection === 'publish' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                                 <Upload size={16} /> Publish Settings
                             </button>
                         </div>
                     </div>

                     {/* Main Form Area */}
                     <div className="flex-1 overflow-y-auto p-8 bg-background/50">
                         <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
                             {configSection === 'identity' && (
                                 <div className="space-y-6">
                                     <h2 className="text-xl font-bold text-foreground mb-6">Agent Identity</h2>
                                     <Input label="Agent Name" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="e.g. Data Analyst Pro" />
                                     <Input label="Short Description" value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="A brief summary of what this agent does..." />
                                     <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-4">Theme Color</label>
                                        <div className="flex flex-wrap gap-4">
                                          {COLORS.map((c) => (
                                            <button key={c} onClick={() => setColor(c)} className={`w-10 h-10 rounded-xl ${c} transition-all ${color === c ? 'ring-2 ring-primary ring-offset-4 ring-offset-background scale-110 shadow-xl' : 'opacity-40 hover:opacity-100 scale-90 hover:scale-100'}`} />
                                          ))}
                                        </div>
                                      </div>
                                 </div>
                             )}

                             {configSection === 'behavior' && (
                                 <div className="space-y-6 h-full flex flex-col">
                                     <div className="flex items-center justify-between">
                                         <h2 className="text-xl font-bold text-foreground">System Instructions</h2>
                                         <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Markdown supported</span>
                                     </div>
                                     <div className="flex-1 min-h-[500px]">
                                         <TextArea label="" rows={25} value={instruction} onChange={(e: any) => setInstruction(e.target.value)} className="font-mono text-sm leading-relaxed bg-secondary border-border" placeholder="You are a helpful assistant..." />
                                     </div>
                                 </div>
                             )}
                             
                             {configSection === 'knowledge' && (
                                 <div className="space-y-6">
                                     <h2 className="text-xl font-bold text-foreground">Knowledge Base</h2>
                                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border hover:border-primary hover:bg-muted/50 rounded-2xl p-12 text-center cursor-pointer transition-all group">
                                      <div className="w-16 h-16 bg-muted group-hover:bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 transition-all">
                                          <Upload className="text-muted-foreground group-hover:text-primary" size={32} />
                                      </div>
                                      <p className="text-sm text-foreground font-bold">Click to upload files</p>
                                      <p className="text-xs text-muted-foreground mt-2 font-medium">PDF, TXT, MD supported</p>
                                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} multiple accept=".txt,.md,.pdf" />
                                    </div>
                                    
                                    {showFileWarning && (
                                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-200 flex items-center gap-3 font-medium">
                                        <AlertTriangle size={18} /> Large PDFs may take a few seconds to process.
                                      </div>
                                    )}

                                    <div className="flex flex-col gap-2">
                                        {existingFiles.map(f => (
                                            <div key={f.id} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border text-sm group hover:border-primary/50 transition-all shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                                                        <FileText size={16} className="text-muted-foreground" />
                                                    </div>
                                                    <span className="text-foreground font-bold">{f.name}</span>
                                                </div>
                                                <button onClick={() => handleRemoveExistingFile(f)} className="text-muted-foreground hover:text-red-500 p-2 transition-colors"><X size={16} /></button>
                                            </div>
                                        ))}
                                        {newFiles.map((f, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-green-500/5 rounded-xl border border-green-500/20 text-sm shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                                                        <FileText size={16} className="text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <span className="text-green-700 dark:text-green-200 font-bold">{f.name}</span>
                                                    <span className="text-[9px] px-2 py-0.5 bg-green-500 text-white font-black rounded-full shadow-sm">NEW</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                 </div>
                             )}
                             
                             {configSection === 'capabilities' && (
                                <div className="space-y-6">
                                     <h2 className="text-xl font-bold text-white">Advanced Capabilities</h2>
                                     <div className="flex flex-col gap-3">
                                        {Object.entries(enabledCapabilities).map(([key, value]) => (
                                            <label key={key} className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${value ? 'bg-blue-900/10 border-blue-500/30' : 'bg-slate-900/30 border-slate-800 hover:bg-slate-900'}`}>
                                                <input type="checkbox" checked={value} onChange={() => setEnabledCapabilities({ ...enabledCapabilities, [key]: !value })} className="mt-1 w-5 h-5 rounded border-slate-700 bg-slate-950 text-blue-500" />
                                                <div className="flex-1">
                                                    <span className="text-sm font-bold text-slate-200 capitalize block mb-0.5">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                    <p className="text-xs text-slate-500">
                                                        {key === 'codeExecution' && 'Allows the agent to write and run Python code for math, data analysis, and file generation.'}
                                                        {key === 'webBrowsing' && 'Enables real-time web search to answer questions about current events.'}
                                                        {key === 'fileHandling' && 'Required for processing uploaded documents.'}
                                                        {key === 'apiIntegrations' && 'Enables connection to external tools and APIs.'}
                                                    </p>
                                                </div>
                                            </label>
                                        ))}
                                     </div>
                                 </div>
                             )}

                             {configSection === 'tools' && (
                                 <div className="space-y-6">
                                    <h2 className="text-xl font-bold text-white">Tools & Actions</h2>
                                    <p className="text-sm text-slate-400">Configure external API tools that your agent can call.</p>
                                    <ActionsConfig agentId={initialData?.id || ''} actions={actions} setActions={setActions} />
                                 </div>
                             )}

                             {configSection === 'publish' && (
                                 <div className="space-y-6">
                                    <h2 className="text-xl font-bold text-foreground">Publish Settings</h2>
                                    
                                    <div className="p-6 bg-card rounded-2xl border border-border shadow-sm space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-black text-foreground">Public Marketplace</h4>
                                                <p className="text-xs font-medium text-muted-foreground mt-1">Make this agent discoverable by other users.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="sr-only peer" />
                                                <div className="w-12 h-6.5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                                            </label>
                                        </div>
                                        
                                        {isPublic && (
                                            <div className="pt-6 border-t border-border animate-in slide-in-from-top-4 duration-300">
                                                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest block mb-3">Cost per Run (Credits)</label>
                                                <div className="flex items-center gap-3">
                                                    <Input type="number" min={1} value={creditsPerRun} onChange={(e: any) => setCreditsPerRun(parseInt(e.target.value) || 1)} className="w-32 bg-secondary border-border" />
                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Credits</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="p-6 bg-card rounded-2xl border border-border shadow-sm space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-black text-foreground">Expert Reviews</h4>
                                                <p className="text-xs font-medium text-muted-foreground mt-1">Allow users to request manual review of outputs.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={allowReviews} onChange={(e) => setAllowReviews(e.target.checked)} className="sr-only peer" />
                                                <div className="w-12 h-6.5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 shadow-inner"></div>
                                            </label>
                                        </div>
                                         {allowReviews && (
                                            <div className="pt-6 border-t border-border animate-in slide-in-from-top-4 duration-300">
                                                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest block mb-3">Review Fee (Credits)</label>
                                                <div className="flex items-center gap-3">
                                                    <Input type="number" min={0} value={reviewCost} onChange={(e: any) => setReviewCost(parseInt(e.target.value) || 0)} className="w-32 bg-secondary border-border" />
                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Credits</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                 </div>
                             )}
                         </div>
                     </div>
                 </div>
             )}
          </div>

          {/* Right Panel: Preview & Debug */}
          <div className="w-[450px] flex flex-col border-l border-border bg-background shrink-0">
             {/* Panel Tabs */}
             <div className="h-10 flex items-center border-b border-border bg-card/50 backdrop-blur-sm">
                 <button onClick={() => setRightPanelTab('preview')} className={`flex-1 h-full text-[10px] font-black uppercase tracking-widest transition-all ${rightPanelTab === 'preview' ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                     Preview Chat
                 </button>
                 <button onClick={() => setRightPanelTab('debug')} className={`flex-1 h-full text-[10px] font-black uppercase tracking-widest transition-all border-l border-border ${rightPanelTab === 'debug' ? 'text-purple-600 dark:text-purple-400 bg-purple-500/5' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                     Debugger
                 </button>
             </div>
             
             <div className="flex-1 overflow-hidden p-4 relative bg-card/30">
                 <div className={`h-full flex flex-col ${rightPanelTab !== 'preview' ? 'hidden' : ''}`}>
                    <PreviewChat draftAgent={currentPayload} onDebugLog={addDebugLog} />
                 </div>
                 <div className={`h-full ${rightPanelTab !== 'debug' ? 'hidden' : ''}`}>
                     <AgentDebugger logs={debugLogs} isThinking={false} />
                 </div>
             </div>
          </div>
      </div>
    </div>
  );
};

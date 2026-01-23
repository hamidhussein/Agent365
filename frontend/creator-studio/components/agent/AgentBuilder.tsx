import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Bot, Cpu, Settings, FileText, Upload, X, AlertTriangle, Sparkles, Layout } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, TextArea } from '../ui/Input';
import { Accordion } from '../ui/Accordion';
import { Agent, AgentInput, AgentPayload, KnowledgeFile } from '../../types';
import { COLORS } from '../../constants';
import { BuilderChat } from './BuilderChat';
import { PreviewChat } from './PreviewChat';

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

  // New Builder State
  const [activeTab, setActiveTab] = useState<'create' | 'configure'>('create');

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

  return (
    <div className="w-full pb-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md py-4 -mx-4 px-6 border-b border-slate-800 shadow-xl">
        <div className="flex items-center gap-6">
          <Button variant="outline" className="text-xs h-9 bg-slate-800 border-slate-700 hover:bg-slate-700" onClick={onCancel}>
            <X size={14} className="mr-2" /> Cancel
          </Button>
          <div className="h-6 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
             <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{initialData ? 'Editing' : 'Building'}</div>
             <p className="text-sm font-bold text-white truncate max-w-[200px]">{name || 'New Agent'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
             <button 
                onClick={() => setActiveTab('create')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'create' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
             >
                <Sparkles size={14} /> Create
             </button>
             <button 
                onClick={() => setActiveTab('configure')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'configure' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
             >
                <Settings size={14} /> Configure
             </button>
          </div>
          <Button className="h-9 px-8 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 font-bold" onClick={handleSubmit}>
            {initialData ? 'Save Changes' : 'Create Agent'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_480px] gap-8">
        {/* Left Side: Builder */}
        <div className="space-y-6 min-w-0">
          {activeTab === 'create' ? (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
               <div className="mb-6 p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Sparkles size={20} className="text-emerald-400" /> Conversational Architect
                  </h3>
                  <p className="text-sm text-slate-400">
                    Tell the architect what you want to build. It will automatically suggest Name, Instructions, and Capabilities for you.
                  </p>
               </div>
               <BuilderChat 
                  currentState={currentPayload} 
                  onUpdateState={handleArchitectUpdate}
                  agentId={initialData?.id}
                />
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
               <Accordion title="Identity" icon={<Bot size={20} />} defaultOpen={true}>
                <div className="grid gap-4">
                  <Input label="Agent Name" value={name} onChange={(e: any) => setName(e.target.value)} />
                  <Input label="Short Description" value={description} onChange={(e: any) => setDescription(e.target.value)} />
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-3">Theme Color</label>
                    <div className="flex flex-wrap gap-3">
                      {COLORS.map((c) => (
                        <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full ${c} transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110 shadow-lg' : 'opacity-60 hover:opacity-100 hover:scale-105'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </Accordion>

              <Accordion title="Behavior & Instructions" icon={<Cpu size={20} />} defaultOpen={true}>
                <TextArea label="System Instructions" rows={10} value={instruction} onChange={(e: any) => setInstruction(e.target.value)} />
              </Accordion>

              <Accordion title="Knowledge Base" icon={<FileText size={20} />}>
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-700 hover:border-blue-500 hover:bg-slate-800/60 rounded-xl p-8 text-center cursor-pointer transition-all">
                  <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                  <p className="text-sm text-slate-200 font-medium">Click to upload files</p>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} multiple accept=".txt,.md,.pdf" />
                </div>
                {showFileWarning && (
                  <div className="mt-3 text-xs text-amber-300 flex items-center gap-2">
                    <AlertTriangle size={14} /> Large PDFs may take a few seconds to process.
                  </div>
                )}
                <div className="mt-4 space-y-2">
                    {existingFiles.map(f => (
                        <div key={f.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800 text-sm">
                            <span className="text-slate-300 font-medium">{f.name}</span>
                            <button onClick={() => handleRemoveExistingFile(f)} className="text-slate-500 hover:text-red-400"><X size={16} /></button>
                        </div>
                    ))}
                </div>
              </Accordion>

              <Accordion title="Advanced Capabilities" icon={<Settings size={20} />}>
                 <div className="space-y-3">
                    {Object.entries(enabledCapabilities).map(([key, value]) => (
                        <label key={key} className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
                            <span className="text-sm font-medium text-slate-200 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <input type="checkbox" checked={value} onChange={() => setEnabledCapabilities({ ...enabledCapabilities, [key]: !value })} className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-blue-500" />
                        </label>
                    ))}
                 </div>
              </Accordion>

              <Accordion title="Marketplace Settings" icon={<Settings size={20} />}>
                <div className="space-y-4">
                  <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
                    <span>Make this agent public</span>
                    <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-4 w-4 rounded border-slate-600 bg-slate-900" />
                  </label>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                    <label className="text-xs text-slate-400 block mb-2">Credits per run</label>
                    <input type="number" min={1} value={creditsPerRun} onChange={(e) => setCreditsPerRun(parseInt(e.target.value) || 1)} disabled={!isPublic} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none disabled:opacity-60" />
                  </div>
                  <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
                    <span>Allow Expert Reviews</span>
                    <input type="checkbox" checked={allowReviews} onChange={(e) => setAllowReviews(e.target.checked)} className="h-4 w-4 rounded border-slate-600 bg-slate-900" />
                  </label>
                  {allowReviews && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 animate-in fade-in slide-in-from-top-2">
                        <label className="text-xs text-slate-400 block mb-2">Review Cost (Credits)</label>
                        <input type="number" min={0} value={reviewCost} onChange={(e) => setReviewCost(parseInt(e.target.value) || 0)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none" />
                    </div>
                  )}
                </div>
              </Accordion>
            </div>
          )}
        </div>

        {/* Right Side: Preview */}
        <aside className="lg:sticky lg:top-24 h-fit">
           <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 uppercase tracking-widest">
                <Layout size={16} className="text-blue-400" /> Preview
              </h3>
              <div className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase tracking-widest">Real-time</div>
           </div>
           <PreviewChat draftAgent={currentPayload} />
           
           <div className="mt-6 p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-500 leading-relaxed italic">
                Preview reflects unsaved changes. Any instruction or capability you adjust will be immediately applied to the preview chat.
           </div>
        </aside>
      </div>
    </div>
  );
};

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Bot, Cpu, Settings, FileText, Upload, X, AlertTriangle, Plus, Trash2, Sparkles, Loader2, Globe, MessageSquare, Briefcase, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, TextArea } from '../ui/Input';
import { Accordion } from '../ui/Accordion';
import { Agent, AgentInput, AgentPayload, KnowledgeFile } from '../../types';
import { agentsApi } from '../../api';
import { COLORS, AGENT_TEMPLATES } from '../../constants';

const formatSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  return `${(size / 1024).toFixed(1)} KB`;
};



export const AgentBuilder = ({
  onCancel,
  onSave,
  initialData
}: {
  onCancel: () => void,
  onSave: (payload: AgentPayload, newFiles: File[], removedFileIds: string[]) => void,
  initialData?: Agent
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [instruction, setInstruction] = useState(initialData?.instruction || '');
  const [color, setColor] = useState(initialData?.color || COLORS[0]);
  // Model selection state removed - handled by admin config
  const [inputs, setInputs] = useState<AgentInput[]>(initialData?.inputs || []);
  const [isPublic, setIsPublic] = useState(initialData?.isPublic ?? false);
  const [creditsPerRun, setCreditsPerRun] = useState(initialData?.creditsPerRun ?? 1);
  const [allowReviews, setAllowReviews] = useState(initialData?.allow_reviews || false);
  const [reviewCost, setReviewCost] = useState(initialData?.review_cost || 5);
  const [enabledCapabilities] = useState(initialData?.enabledCapabilities || {
    codeExecution: initialData?.capabilities?.includes('code_execution') || false,
    webBrowsing: initialData?.capabilities?.includes('web_search') || false, // Mapping 'web_search' to webBrowsing UI
    apiIntegrations: initialData?.capabilities?.includes('api_access') || false,
    fileHandling: initialData?.capabilities?.some(c => c === 'file_handling' || c === 'files') || false,
  });
  const [existingFiles, setExistingFiles] = useState<KnowledgeFile[]>(initialData?.files || []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [removedFileIds, setRemovedFileIds] = useState<string[]>([]);
  const [showFileWarning, setShowFileWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assistNotes, setAssistNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [assistError, setAssistError] = useState<string | null>(null);

  // Provider state removed

  // Provider state removed

  const createInputId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `input-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  };

  const handleAddInput = () => {
    setInputs(prev => [
      ...prev,
      { id: createInputId(), label: '', type: 'text', required: true, description: '' }
    ]);
  };

  const handleUpdateInput = (id: string, updates: Partial<AgentInput>) => {
    setInputs(prev => prev.map(input => input.id === id ? { ...input, ...updates } : input));
  };

  const handleRemoveInput = (id: string) => {
    setInputs(prev => prev.filter(input => input.id !== id));
  };

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

  const handleRemoveNewFile = (file: File) => {
    setNewFiles(prev => prev.filter(item => item !== file));
  };

  const handleAssist = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setAssistError('Add an agent name first.');
      return;
    }
    setIsGenerating(true);
    setAssistError(null);
    try {
      const result = await agentsApi.suggest({
        name: trimmedName,
        description: description.trim() || undefined,
        instruction: instruction.trim() || undefined,
        notes: assistNotes.trim() || undefined,
        action: 'suggest', // Backend now handles the logic based on content/notes
        model: 'auto'
      });
      setDescription(result.description);
      setInstruction(result.instruction);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to generate suggestions.';
      setAssistError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = () => {
    if (!name || !instruction) return;
    const normalizedInputs = inputs
      .map((input) => ({
        ...input,
        label: input.label.trim(),
        description: input.description?.trim() || undefined
      }))
      .filter((input) => input.label);
    const payload: AgentPayload = {
      name,
      description,
      instruction,
      model: 'auto', // Backend handles actual selection
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
      inputs: normalizedInputs,
      files: existingFiles.map(f => f.id)
    };
    onSave(payload, newFiles, removedFileIds);
  };

  const LivePreview = () => (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-sm overflow-hidden relative group/preview">
      <div className="absolute top-0 right-0 p-3">
        <div className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase tracking-wider">Preview</div>
      </div>
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white shadow-lg shadow-black/20 group-hover/preview:scale-110 transition-transform duration-500`}>
          <Bot size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-bold text-white truncate">{name || 'Agent Name'}</h4>
          <p className="text-xs text-slate-500 truncate">AI Agent (Auto-Selected Model)</p>
        </div>
      </div>
      <p className="text-sm text-slate-400 line-clamp-2 mb-4 h-10 italic">
        {description || 'Provide a description to see it here...'}
      </p>
      <div className="pt-4 border-t border-slate-800/50">
        <Button className="w-full h-9 text-xs" variant="secondary" disabled>
          <MessageSquare size={14} /> Chat Now
        </Button>
      </div>
      
      {/* Aesthetic shimmer */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover/preview:translate-x-full transition-transform duration-1000" />
    </div>
  );

  return (
    <div className="w-full pb-8">
      <div className="mb-6 flex items-center justify-between sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md py-2 -mx-2 px-2 border-b border-slate-800/50">
        <div className="flex items-center gap-4">
          <Button variant="outline" className="text-xs h-8" onClick={onCancel}>Cancel</Button>
          <div className="h-4 w-px bg-slate-800" />
          <p className="text-xs text-slate-500 italic hidden sm:block">Drafting {name || 'new agent'}...</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="h-9 px-6 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20" onClick={handleSubmit}>
            {initialData ? 'Save Changes' : 'Create Agent'}
          </Button>
        </div>
      </div>


      <div className="mb-8">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Quick Start Templates</p>
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 mask-fade-right">
          {AGENT_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => {
                setName(tmpl.name);
                setDescription(tmpl.description);
                setInstruction(tmpl.instruction);
                setColor(tmpl.color);
                // Model selection removed from template
              }}
              className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-slate-800/40 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-blue-500/50 transition-all group"
            >
              <div className={`w-8 h-8 rounded-lg ${tmpl.color} flex items-center justify-center text-white shadow-sm`}>
                {tmpl.icon === 'Bot' && <Bot size={14} />}
                {tmpl.icon === 'Cpu' && <Cpu size={14} />}
                {tmpl.icon === 'Sparkles' && <Sparkles size={14} />}
                {tmpl.icon === 'Brain' && <Bot size={14} />}
                {tmpl.icon === 'Globe' && <Globe size={14} />}
                {tmpl.icon === 'Briefcase' && <Briefcase size={14} />}
                {tmpl.icon === 'FileText' && <FileText size={14} />}
                {tmpl.icon === 'Users' && <Users size={14} />}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors">{tmpl.name}</p>
                <p className="text-[10px] text-slate-500">{tmpl.id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-6 min-w-0 w-full">
          <Accordion 
            title="Identity" 
            icon={<Bot size={20} />} 
            defaultOpen={true}
          >
            <div className="grid gap-4">
              <Input
                label="Agent Name"
                placeholder="e.g., Customer Support Bot"
                value={name}
                onChange={(e: any) => setName(e.target.value)}
              />
              <Input
                label="Short Description"
                placeholder="e.g., Handles level 1 support queries"
                value={description}
                onChange={(e: any) => setDescription(e.target.value)}
              />
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-3">Theme Color</label>
                <div className="flex flex-wrap gap-3">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full ${c} transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                      aria-label={`Select ${c.split('-')[1]} color`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Accordion>

          <Accordion 
            title="Behavior & Instructions" 
            icon={<Cpu size={20} />}
            defaultOpen={instruction.length > 0}
          >
            <TextArea
              label="System Instructions"
              placeholder="You are a helpful assistant. You should be polite and concise..."
              rows={8}
              value={instruction}
              onChange={(e: any) => setInstruction(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-2">Provide clear rules for the agent to follow.</p>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Sparkles size={16} className="text-emerald-300" /> AI Assist
                </div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">Uses selected model</span>
              </div>

              <div className="mt-3">
                <TextArea
                  label="Notes (optional)"
                  rows={3}
                  placeholder="Add context like target audience, tone, or tasks to focus on."
                  value={assistNotes}
                  onChange={(e: any) => setAssistNotes(e.target.value)}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="text-xs flex items-center gap-2"
                  onClick={handleAssist}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} className="text-emerald-400" />
                  )}
                  {description || instruction ? 'Regenerate' : 'Generate'}
                </Button>
              </div>

              {assistError && (
                <p className="mt-3 text-xs text-red-300">{assistError}</p>
              )}
            </div>
          </Accordion>

          <Accordion 
            title="Knowledge Base" 
            icon={<FileText size={20} />}
            defaultOpen={existingFiles.length > 0 || newFiles.length > 0}
          >
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-blue-500 hover:bg-slate-800/60 rounded-xl p-6 text-center cursor-pointer transition-all"
              role="button"
              tabIndex={0}
              aria-label="Upload files"
            >
              <Upload className="mx-auto text-slate-400 mb-2" size={24} />
              <p className="text-sm text-slate-200 font-medium">Click to upload files</p>
              <p className="text-xs text-slate-500 mt-1">PDF, TXT, MD (Max 5MB)</p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                multiple
                accept=".txt,.md,.pdf"
              />
            </div>

            {showFileWarning && (
              <div className="mt-3 text-xs text-amber-300 flex items-center gap-2">
                <AlertTriangle size={14} /> Large PDFs may take a few seconds to process.
              </div>
            )}

            {(existingFiles.length > 0 || newFiles.length > 0) && (
              <div className="mt-4 space-y-2">
                {existingFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 bg-slate-900 rounded-lg border border-slate-700 text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <FileText size={14} className="text-slate-400" />
                      <span className="text-slate-300 truncate">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase text-slate-500">Saved</span>
                      <button
                        onClick={() => handleRemoveExistingFile(file)}
                        className="text-slate-500 hover:text-red-400"
                        aria-label={`Remove file ${file.name}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {newFiles.map((file) => (
                  <div key={`${file.name}-${file.size}`} className="flex items-center justify-between p-2 bg-slate-900 rounded-lg border border-slate-700 text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <FileText size={14} className="text-slate-400" />
                      <span className="text-slate-300 truncate">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase text-slate-500">New</span>
                      <span className="text-[10px] text-slate-500">{formatSize(file.size)}</span>
                      <button
                        onClick={() => handleRemoveNewFile(file)}
                        className="text-slate-500 hover:text-red-400"
                        aria-label={`Remove file ${file.name}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Accordion>

          <Accordion 
            title="Data Collection Fields" 
            icon={<Settings size={20} />}
            defaultOpen={inputs.length > 0}
          >
            <p className="text-xs text-slate-500 mb-4">Require users to provide specific inputs before the chat begins.</p>

            {inputs.length === 0 ? (
              <p className="text-sm text-slate-500 italic pb-2">No required fields yet.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {inputs.map((input) => (
                  <div key={input.id} className="border border-slate-800 rounded-xl p-4 bg-slate-900/60 space-y-3">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <Input
                          label="Label"
                          placeholder="e.g., Customer ID"
                          value={input.label}
                          onChange={(e: any) => handleUpdateInput(input.id, { label: e.target.value })}
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveInput(input.id)}
                        className="mt-8 text-slate-500 hover:text-red-400 transition-colors"
                        aria-label={`Remove ${input.label || 'field'}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Type</label>
                        <select
                          value={input.type}
                          onChange={(e) => handleUpdateInput(input.id, { type: e.target.value as AgentInput['type'] })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none"
                        >
                          <option value="text">Text</option>
                          <option value="textarea">Textarea</option>
                          <option value="file">File</option>
                        </select>
                      </div>

                      <div className="flex items-center pt-5">
                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={input.required}
                            onChange={(e) => handleUpdateInput(input.id, { required: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                          />
                          Required Field
                        </label>
                      </div>
                    </div>

                    <Input
                      label="Description (optional)"
                      placeholder="Shown to users before chat starts."
                      value={input.description || ''}
                      onChange={(e: any) => handleUpdateInput(input.id, { description: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}

            <Button variant="outline" className="text-xs" onClick={handleAddInput}>
              <Plus size={14} /> Add Field
            </Button>
          </Accordion>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 h-fit">
          <section>
            <LivePreview />
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Settings className="text-emerald-400" size={20} /> Marketplace Settings
            </h3>
            <p className="text-xs text-slate-500 mb-4">Publish this agent to the public marketplace and charge credits per run.</p>

            <div className="space-y-4">
              <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
                <span>Make this agent public</span>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                />
              </label>

              <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                <label className="text-xs text-slate-400 block mb-2">Credits per run</label>
                <input
                  type="number"
                  min={1}
                  value={creditsPerRun}
                  onChange={(e) => setCreditsPerRun(parseInt(e.target.value) || 1)}
                  disabled={!isPublic}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none disabled:opacity-60"
                />
                <p className="text-[10px] text-slate-500 mt-2">Guests will spend this amount per conversation request.</p>
              </div>

               <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-200 mt-4">
                <span>Allow Expert Reviews</span>
                <input
                  type="checkbox"
                  checked={allowReviews}
                  onChange={(e) => setAllowReviews(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                />
              </label>

              {allowReviews && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 animate-in fade-in slide-in-from-top-2">
                    <label className="text-xs text-slate-400 block mb-2">Review Cost (Credits)</label>
                    <input
                    type="number"
                    min={0}
                    value={reviewCost}
                    onChange={(e) => setReviewCost(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-2">Cost for a user to request a manual review from you.</p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};









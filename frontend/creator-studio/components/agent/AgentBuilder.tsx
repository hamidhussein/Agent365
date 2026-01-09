import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Bot, Cpu, Settings, CheckCircle2, FileText, Upload, X, AlertTriangle, Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, TextArea } from '../ui/Input';
import { Agent, AgentInput, AgentPayload, KnowledgeFile } from '../../types';
import { agentsApi } from '../../api';
import { MODEL_OPTIONS, COLORS } from '../../constants';

const formatSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  return `${(size / 1024).toFixed(1)} KB`;
};

const PROVIDER_ORDER = ['openai', 'google', 'anthropic', 'groq', 'llama'] as const;

const PROVIDER_LABELS: Record<(typeof PROVIDER_ORDER)[number], string> = {
  openai: 'OpenAI',
  google: 'Google Gemini',
  anthropic: 'Anthropic',
  groq: 'Groq',
  llama: 'Llama'
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
  const [model, setModel] = useState(initialData?.model || MODEL_OPTIONS[0].id);
  const [inputs, setInputs] = useState<AgentInput[]>(initialData?.inputs || []);
  const [isPublic, setIsPublic] = useState(initialData?.isPublic ?? false);
  const [creditsPerRun, setCreditsPerRun] = useState(initialData?.creditsPerRun ?? 1);
  const [existingFiles, setExistingFiles] = useState<KnowledgeFile[]>(initialData?.files || []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [removedFileIds, setRemovedFileIds] = useState<string[]>([]);
  const [showFileWarning, setShowFileWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assistNotes, setAssistNotes] = useState('');
  const [assistLoading, setAssistLoading] = useState<null | 'suggest' | 'refine' | 'regenerate'>(null);
  const [assistError, setAssistError] = useState<string | null>(null);

  const groupedModels = PROVIDER_ORDER
    .map((provider) => ({
      provider,
      label: PROVIDER_LABELS[provider],
      options: MODEL_OPTIONS.filter((opt) => opt.provider === provider)
    }))
    .filter((group) => group.options.length > 0);

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

  const handleAssist = async (action: 'suggest' | 'refine' | 'regenerate') => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setAssistError('Add an agent name first.');
      return;
    }
    setAssistLoading(action);
    setAssistError(null);
    try {
      const result = await agentsApi.suggest({
        name: trimmedName,
        description: description.trim() || undefined,
        instruction: instruction.trim() || undefined,
        notes: assistNotes.trim() || undefined,
        action
      });
      setDescription(result.description);
      setInstruction(result.instruction);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to generate suggestions.';
      setAssistError(message);
    } finally {
      setAssistLoading(null);
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
      model,
      color: initialData?.color || COLORS[Math.floor(Math.random() * COLORS.length)],
      inputs: normalizedInputs,
      isPublic,
      creditsPerRun: Math.max(1, Math.floor(creditsPerRun || 1))
    };
    onSave(payload, newFiles, removedFileIds);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 pb-16">
      <div className="mb-8 p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{initialData ? 'Edit Agent' : 'Create New Agent'}</h2>
            <p className="text-sm text-slate-400">Configure personality, knowledge, and deployment settings.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleSubmit}>{initialData ? 'Update Agent' : 'Create Agent'}</Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Bot className="text-blue-400" size={20} /> Identity
            </h3>
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
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Cpu className="text-purple-400" size={20} /> Behavior & Instructions
            </h3>
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
                  className="text-xs"
                  onClick={() => handleAssist('suggest')}
                  disabled={assistLoading !== null}
                >
                  {assistLoading === 'suggest' ? <Loader2 size={14} className="animate-spin" /> : 'Suggest'}
                </Button>
                <Button
                  variant="outline"
                  className="text-xs"
                  onClick={() => handleAssist('refine')}
                  disabled={assistLoading !== null}
                >
                  {assistLoading === 'refine' ? <Loader2 size={14} className="animate-spin" /> : 'Refine'}
                </Button>
                <Button
                  variant="outline"
                  className="text-xs"
                  onClick={() => handleAssist('regenerate')}
                  disabled={assistLoading !== null}
                >
                  {assistLoading === 'regenerate' ? <Loader2 size={14} className="animate-spin" /> : 'Regenerate'}
                </Button>
              </div>

              {assistError && (
                <p className="mt-3 text-xs text-red-300">{assistError}</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="text-emerald-400" size={20} /> Knowledge Base
            </h3>

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
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <Settings className="text-blue-400" size={20} /> Data Collection Fields
            </h3>
            <p className="text-xs text-slate-500 mb-4">Require users to provide specific inputs before the chat begins.</p>

            {inputs.length === 0 ? (
              <p className="text-sm text-slate-500">No required fields yet.</p>
            ) : (
              <div className="space-y-3">
                {inputs.map((input) => (
                  <div key={input.id} className="border border-slate-700 rounded-xl p-3 bg-slate-900/60 space-y-3">
                    <div className="flex items-start gap-3">
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
                        className="mt-6 text-slate-500 hover:text-red-400"
                        aria-label={`Remove ${input.label || 'field'}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

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

                    <label className="flex items-center gap-2 text-xs text-slate-400">
                      <input
                        type="checkbox"
                        checked={input.required}
                        onChange={(e) => handleUpdateInput(input.id, { required: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                      />
                      Required
                    </label>

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

            <Button variant="outline" className="text-xs mt-4" onClick={handleAddInput}>
              <Plus size={14} /> Add Field
            </Button>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Settings className="text-orange-400" size={20} /> Model Configuration
            </h3>
            <p className="text-xs text-slate-500 mb-4">Choose the LLM that powers this agent.</p>

            <div className="space-y-4">
              {groupedModels.map((group) => (
                <div key={group.provider}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400">{group.label}</span>
                    {group.provider === 'llama' && (
                      <span className="text-[10px] uppercase tracking-wider text-slate-400">OpenAI-compatible</span>
                    )}
                    {group.provider === 'groq' && (
                      <span className="text-[10px] uppercase tracking-wider text-cyan-300">Groq Cloud</span>
                    )}
                  </div>
                  <div className="grid gap-2">
                    {group.options.map((opt) => {
                      const isDisabled = opt.status === 'coming-soon';
                      const isSelected = model === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => !isDisabled && setModel(opt.id)}
                          disabled={isDisabled}
                          aria-pressed={isSelected}
                          className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                            isSelected
                              ? 'border-blue-500/70 bg-blue-500/10 ring-1 ring-blue-500/40'
                              : 'border-slate-800 bg-slate-900/70 hover:border-slate-600 hover:bg-slate-900/90'
                          } ${isDisabled ? 'cursor-not-allowed opacity-60 hover:border-slate-800 hover:bg-slate-900/70' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              {opt.icon}
                              <span className="text-sm font-medium text-slate-200">{opt.label}</span>
                            </div>
                            {isSelected && <CheckCircle2 size={16} className="text-blue-400" />}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{opt.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
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
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};









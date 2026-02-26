import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Share2, Settings, Users, BarChart2, Copy, Check, Trash2, Power, PowerOff, Plus, ExternalLink, Pencil, Globe, Lock, Clock, Hash, Mail, ChevronRight } from 'lucide-react';
import { Agent, AgentPayload } from '../../types';
import { Button } from '../ui/Button';
import CreateShareLinkModal from '../agent/CreateShareLinkModal';
import axios from 'axios';
import { COLORS, MODEL_OPTIONS } from '../../constants';

// ── Types ────────────────────────────────────────────────────────────────────

interface ShareLink {
  id: string;
  share_token: string;
  share_url: string;
  name: string | null;
  link_type: string;
  is_active: boolean;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  created_at: string;
  allowed_emails: string[];
}

type ManageTab = 'overview' | 'share' | 'users' | 'settings';

interface AgentManagePageProps {
  agent: Agent;
  onBack: () => void;
  onOpenChat: (agent: Agent) => void;
  onSave: (payload: AgentPayload, newFiles: File[], removedFileIds: string[]) => void;
  onDelete: (id: string) => void;
  onOpenBuilder: (agent: Agent) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';
const getAuthHeaders = () => {
  const token = sessionStorage.getItem('auth_token_session');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ── Tab: Overview ────────────────────────────────────────────────────────────

const OverviewTab: React.FC<{ agent: Agent; onOpenChat: (agent: Agent) => void; onOpenBuilder: (agent: Agent) => void }> = ({ agent, onOpenChat, onOpenBuilder }) => {
  const opt = MODEL_OPTIONS.find(o => o.id === agent.model);
  const caps = agent.enabledCapabilities || {};
  const capLabels: Record<string, { label: string; color: string }> = {
    webBrowsing:    { label: 'Web Search',    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    fileHandling:  { label: 'File Upload',    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    codeExecution: { label: 'Code Execution', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    apiIntegrations:{ label: 'API Access',    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  };
  return (
    <div className="space-y-6">
      {/* Agent Card */}
      <div className="bg-card/60 border border-border/60 rounded-2xl p-6 flex flex-col sm:flex-row gap-6">
        <div className={`w-16 h-16 rounded-2xl ${agent.color || 'bg-blue-500'} flex items-center justify-center text-white shrink-0 text-2xl shadow-lg`}>
          {opt?.icon || '🤖'}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-foreground truncate">{agent.name}</h2>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{agent.description || 'No description'}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="px-2.5 py-1 text-xs font-bold bg-primary/10 text-primary rounded-full border border-primary/20">{opt?.label || agent.model}</span>
            {Object.entries(caps).filter(([, v]) => v).map(([key]) => {
              const cfg = capLabels[key];
              if (!cfg) return null;
              return (
                <span key={key} className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${cfg.color}`}>{cfg.label}</span>
              );
            })}
            {agent.files?.length > 0 && (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                📚 {agent.files.length} Knowledge Files
              </span>
            )}
          </div>
        </div>
        <div className="flex sm:flex-col gap-2 shrink-0">
          <Button className="flex-1 sm:flex-none bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-sm border-0 gap-2" onClick={() => onOpenChat(agent)}>
            <MessageSquare size={15} /> Chat
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-none gap-2 text-muted-foreground hover:text-foreground" onClick={() => onOpenBuilder(agent)}>
            <Pencil size={15} /> Edit in Builder
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Messages', value: '—', icon: <MessageSquare size={18} className="text-primary" /> },
          { label: 'Share Links', value: '—', icon: <Share2 size={18} className="text-indigo-400" /> },
          { label: 'Knowledge Files', value: String(agent.files?.length || 0), icon: <BarChart2 size={18} className="text-emerald-400" /> },
          { label: 'Model', value: opt?.label?.split(' ')[0] || '—', icon: <Settings size={18} className="text-orange-400" /> },
        ].map((stat) => (
          <div key={stat.label} className="bg-card/40 border border-border/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              {stat.icon}
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-2xl font-black text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Welcome Message & Starters */}
      {(agent.welcomeMessage || ((agent.starterQuestions?.length ?? 0) > 0)) && (
        <div className="bg-card/40 border border-border/50 rounded-2xl p-5 space-y-4">
          {agent.welcomeMessage && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Welcome Message</p>
              <p className="text-sm text-foreground bg-muted/40 rounded-xl px-4 py-3">{agent.welcomeMessage}</p>
            </div>
          )}
          {(agent.starterQuestions?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Starter Questions</p>
              <div className="flex flex-wrap gap-2">
                {(agent.starterQuestions ?? []).map((q, i) => (
                  <span key={i} className="px-3 py-1.5 text-xs bg-muted/50 border border-border rounded-xl text-muted-foreground">{q}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Tab: Share Links ─────────────────────────────────────────────────────────

const ShareTab: React.FC<{ agentId: string }> = ({ agentId }) => {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => { loadLinks(); }, [agentId]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/agents/${agentId}/share`, { headers: getAuthHeaders() });
      setLinks(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleActive = async (link: ShareLink) => {
    await axios.patch(`${API_URL}/share/${link.id}/toggle`, {}, { headers: getAuthHeaders() });
    loadLinks();
  };

  const deleteLink = async (id: string) => {
    await axios.delete(`${API_URL}/share/${id}`, { headers: getAuthHeaders() });
    loadLinks();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-foreground">Share Links</h3>
          <p className="text-sm text-muted-foreground">Manage who can access this agent</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm border-0 gap-2 font-bold" onClick={() => setShowCreateModal(true)}>
          <Plus size={15} /> New Link
        </Button>
      </div>

      {links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-2xl bg-muted/10 text-center px-6">
          <Share2 size={32} className="text-muted-foreground mb-3" />
          <p className="font-bold text-foreground mb-1">No share links yet</p>
          <p className="text-sm text-muted-foreground mb-5">Create a public or private link to share this agent</p>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 gap-2 font-bold" onClick={() => setShowCreateModal(true)}>
            <Plus size={15} /> Create First Link
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.id} className={`bg-card/60 border rounded-2xl p-4 transition-all ${link.is_active ? 'border-border/60' : 'border-border/30 opacity-60'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${link.link_type === 'public' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                  {link.link_type === 'public' ? <Globe size={16} /> : <Lock size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate">{link.name || `${link.link_type === 'public' ? 'Public' : 'Private'} Link`}</span>
                    {!link.is_active && <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">Inactive</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Hash size={11} /> {link.current_uses}{link.max_uses ? `/${link.max_uses}` : ''} uses
                    </span>
                    {link.expires_at && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={11} /> Expires {new Date(link.expires_at).toLocaleDateString()}
                      </span>
                    )}
                    {link.link_type === 'private' && link.allowed_emails.length > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail size={11} /> {link.allowed_emails.length} allowed
                      </span>
                    )}
                  </div>
                  {/* Private link: show allowed emails */}
                  {link.link_type === 'private' && link.allowed_emails.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {link.allowed_emails.map(email => (
                        <span key={email} className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full">{email}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-2">
                    <code className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg truncate max-w-[240px]">{link.share_url}</code>
                    <button
                      onClick={() => copyUrl(link.share_url, link.id)}
                      className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy URL"
                    >
                      {copiedId === link.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                    <a href={link.share_url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                      title="Open link">
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => toggleActive(link)}
                    className={`p-1.5 rounded-lg transition-colors ${link.is_active ? 'hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500' : 'hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500'}`}
                    title={link.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {link.is_active ? <PowerOff size={15} /> : <Power size={15} />}
                  </button>
                  <button
                    onClick={() => deleteLink(link.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                    title="Delete link"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateShareLinkModal
          agentId={agentId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); loadLinks(); }}
        />
      )}
    </div>
  );
};

// ── Tab: Users ───────────────────────────────────────────────────────────────

const UsersTab: React.FC<{ agentId: string }> = ({ agentId }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'admin'>('viewer');
  const [users, setUsers] = useState<Array<{ email: string; role: string; source: string; link_name?: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadUsers(); }, [agentId]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/agents/${agentId}/share`, { headers: getAuthHeaders() });
      const links: ShareLink[] = res.data;
      // Aggregate all allowed emails from private links
      const allUsers: typeof users = [];
      links.filter(l => l.link_type === 'private').forEach(link => {
        link.allowed_emails.forEach(email => {
          if (!allUsers.find(u => u.email === email)) {
            allUsers.push({ email, role: 'viewer', source: 'share_link', link_name: link.name });
          }
        });
      });
      setUsers(allUsers);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    // For now this opens a create-private-link flow with the email pre-filled
    // In future Phase 2 this would hit a dedicated /agents/:id/users endpoint
    alert(`Invite feature coming in Phase 2!\n\nFor now, create a Private share link and add ${inviteEmail} to the allowed emails list.`);
    setInviteEmail('');
  };

  return (
    <div className="space-y-5">
      {/* Invite row */}
      <div className="bg-card/60 border border-border/60 rounded-2xl p-5">
        <h3 className="font-bold text-foreground text-sm mb-1">Invite a User</h3>
        <p className="text-xs text-muted-foreground mb-4">Give someone private access to chat with this agent.</p>
        <div className="flex gap-2 flex-wrap">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 min-w-0 rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
          />
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value as 'viewer' | 'admin')}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 font-bold gap-2" onClick={handleInvite}>
            <Mail size={14} /> Invite
          </Button>
        </div>
      </div>

      {/* Current users */}
      <div>
        <h3 className="font-bold text-foreground text-sm mb-3">Users with Access</h3>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-muted/10">
            <Users size={28} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No users have private access yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Create a private share link or use Invite above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.email} className="flex items-center gap-3 p-3 bg-card/40 border border-border/40 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {user.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground">via {user.link_name || 'Private link'}</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Phase 2 notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-sm text-indigo-400">
        <ChevronRight size={16} className="mt-0.5 shrink-0" />
        <p><span className="font-semibold">Phase 2:</span> Direct user invitations with email notifications, role management (Viewer/Admin), and access revocation will be added here.</p>
      </div>
    </div>
  );
};

// ── Tab: Settings (Quick Edit) ───────────────────────────────────────────────

const SettingsTab: React.FC<{
  agent: Agent;
  onSave: (payload: AgentPayload, newFiles: File[], removedFileIds: string[]) => void;
  onOpenBuilder: (agent: Agent) => void;
  onDelete: (id: string) => void;
}> = ({ agent, onSave, onOpenBuilder, onDelete }) => {
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description);
  const [welcomeMessage, setWelcomeMessage] = useState(agent.welcomeMessage || '');
  const [isPublic, setIsPublic] = useState(agent.isPublic ?? false);
  const [caps, setCaps] = useState(agent.enabledCapabilities || {
    codeExecution: false, webBrowsing: false, apiIntegrations: false, fileHandling: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const payload: AgentPayload = {
      name, description,
      instruction: agent.instruction || '',
      model: agent.model || 'auto',
      color: agent.color || COLORS[0],
      isPublic,
      welcomeMessage,
      starterQuestions: agent.starterQuestions || [],
      enabledCapabilities: caps,
      capabilities: [
        caps.codeExecution ? 'code_execution' : '',
        caps.webBrowsing ? 'web_search' : '',
        caps.apiIntegrations ? 'api_access' : '',
        caps.fileHandling ? 'file_handling' : '',
      ].filter(Boolean),
      inputs: agent.inputs || [],
      files: (agent.files || []).map(f => f.id),
    };
    await onSave(payload, [], []);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleCap = (key: string) => setCaps(prev => ({ ...prev, [key]: !prev[key] }));

  const capOptions = [
    { key: 'webBrowsing', label: 'Web Search', desc: 'Search the web in real-time', color: 'emerald' },
    { key: 'fileHandling', label: 'File Upload', desc: 'Accept file & image uploads from users', color: 'blue' },
    { key: 'codeExecution', label: 'Code Execution', desc: 'Run Python code', color: 'orange' },
    { key: 'apiIntegrations', label: 'API Access', desc: 'Call external APIs', color: 'purple' },
  ];

  return (
    <div className="space-y-6 max-w-xl">
      {/* Basic Info */}
      <div className="bg-card/60 border border-border/60 rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-foreground text-sm">Basic Info</h3>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Agent Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary" />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary resize-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Welcome Message</label>
          <textarea value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} rows={2}
            placeholder="What the agent says when a user first opens the chat…"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary resize-none" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-sm font-semibold text-foreground">Public Agent</p>
            <p className="text-xs text-muted-foreground">Visible in the marketplace</p>
          </div>
          <button
            onClick={() => setIsPublic(p => !p)}
            className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? 'bg-primary' : 'bg-muted'}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Capabilities */}
      <div className="bg-card/60 border border-border/60 rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-foreground text-sm">Capabilities</h3>
        {capOptions.map(({ key, label, desc, color }) => (
          <div key={key} className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <button
              onClick={() => toggleCap(key)}
              className={`relative w-11 h-6 rounded-full transition-colors ${(caps as Record<string, boolean>)[key] ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${(caps as Record<string, boolean>)[key] ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}
      </div>

      {/* Advanced: open builder */}
      <div className="bg-card/40 border border-border/50 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">Advanced Configuration</p>
          <p className="text-xs text-muted-foreground mt-0.5">Edit instruction, knowledge files, and more in the full builder.</p>
        </div>
        <Button variant="outline" className="gap-2 text-muted-foreground hover:text-foreground shrink-0 ml-4" onClick={() => onOpenBuilder(agent)}>
          <Pencil size={14} /> Open Builder
        </Button>
      </div>

      {/* Save */}
      <div className="flex gap-3">
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 font-bold shadow-sm gap-2 flex-1"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="border border-red-500/20 bg-red-500/5 rounded-2xl p-5">
        <h3 className="font-bold text-red-500 text-sm mb-1">Danger Zone</h3>
        <p className="text-xs text-muted-foreground mb-4">This action is irreversible. All share links and data associated with this agent will be deleted.</p>
        {confirmDelete ? (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 text-muted-foreground" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0 font-bold" onClick={() => onDelete(agent.id)}>Yes, Delete Agent</Button>
          </div>
        ) : (
          <Button variant="outline" className="text-red-500 border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 gap-2" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} /> Delete Agent
          </Button>
        )}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export const AgentManagePage: React.FC<AgentManagePageProps> = ({
  agent,
  onBack,
  onOpenChat,
  onSave,
  onDelete,
  onOpenBuilder,
}) => {
  const [activeTab, setActiveTab] = useState<ManageTab>('overview');

  const tabs: { id: ManageTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 size={15} /> },
    { id: 'share',    label: 'Share Links', icon: <Share2 size={15} /> },
    { id: 'users',    label: 'Users', icon: <Users size={15} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={15} /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="h-14 flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div className="h-6 w-px bg-border" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Agent</p>
              <p className="text-sm font-black text-foreground truncate">{agent.name}</p>
            </div>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-sm border-0 gap-2 h-9 text-xs px-4 shrink-0"
              onClick={() => onOpenChat(agent)}
            >
              <MessageSquare size={14} /> Open Chat
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        {activeTab === 'overview' && <OverviewTab agent={agent} onOpenChat={onOpenChat} onOpenBuilder={onOpenBuilder} />}
        {activeTab === 'share'    && <ShareTab agentId={agent.id} />}
        {activeTab === 'users'    && <UsersTab agentId={agent.id} />}
        {activeTab === 'settings' && (
          <SettingsTab agent={agent} onSave={onSave} onOpenBuilder={onOpenBuilder} onDelete={onDelete} />
        )}
      </div>
    </div>
  );
};

export default AgentManagePage;

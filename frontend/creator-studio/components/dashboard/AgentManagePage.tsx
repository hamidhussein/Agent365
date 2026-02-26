import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Share2, Settings, Users, BarChart2, Copy, Check, Trash2, Power, PowerOff, Plus, ExternalLink, Pencil, Globe, Lock, Clock, Hash, Mail, X } from 'lucide-react';
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

const OverviewTab: React.FC<{ agent: Agent }> = ({ agent }) => {
  const opt = MODEL_OPTIONS.find(o => o.id === agent.model);
  const caps = agent.enabledCapabilities || {};
  const capLabels: Record<string, { label: string; color: string }> = {
    webBrowsing:     { label: 'Web Search',    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    fileHandling:   { label: 'File Upload',    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    codeExecution:  { label: 'Code Execution', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    apiIntegrations:{ label: 'API Access',     color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  };
  return (
    <div className="space-y-5">
      {/* Agent identity */}
      <div className="bg-card/60 border border-border/60 rounded-2xl p-5 flex gap-4">
        <div className={`w-14 h-14 rounded-xl ${agent.color || 'bg-blue-500'} flex items-center justify-center text-white shrink-0 text-xl shadow-lg`}>
          {opt?.icon || '🤖'}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-black text-foreground truncate">{agent.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{agent.description || 'No description'}</p>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <span className="px-2.5 py-1 text-xs font-bold bg-primary/10 text-primary rounded-full border border-primary/20">{opt?.label || agent.model}</span>
            {Object.entries(caps).filter(([, v]) => v).map(([key]) => {
              const cfg = capLabels[key];
              if (!cfg) return null;
              return <span key={key} className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${cfg.color}`}>{cfg.label}</span>;
            })}
            {(agent.files?.length ?? 0) > 0 && (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                📚 {agent.files.length} Knowledge Files
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Model',           value: opt?.label?.split(' ')[0] || '—', icon: <Settings size={16} className="text-orange-400" /> },
          { label: 'Knowledge Files', value: String(agent.files?.length || 0),  icon: <BarChart2 size={16} className="text-emerald-400" /> },
        ].map((stat) => (
          <div key={stat.label} className="bg-card/40 border border-border/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              {stat.icon}
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-xl font-black text-foreground">{stat.value}</p>
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

interface AgentUser {
  id: string;
  invited_email: string;
  role: string;
  status: string;
  invited_at: string;
  accepted_at: string | null;
}

const UsersTab: React.FC<{ agentId: string }> = ({ agentId }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [users, setUsers] = useState<AgentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  useEffect(() => { loadUsers(); }, [agentId]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/agents/${agentId}/users`, { headers: getAuthHeaders() });
      setUsers(res.data);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      setInviting(true);
      await axios.post(
        `${API_URL}/agents/${agentId}/invite`,
        { email: inviteEmail, role: inviteRole },
        { headers: getAuthHeaders() }
      );
      setInviteEmail('');
      loadUsers();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (invitationId: string, newRole: string) => {
    try {
      await axios.patch(
        `${API_URL}/agents/${agentId}/users/${invitationId}/role`,
        { role: newRole },
        { headers: getAuthHeaders() }
      );
      loadUsers();
    } catch (e) {
      console.error('Failed to update role', e);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    if (!window.confirm('Are you sure you want to revoke access?')) return;
    try {
      await axios.delete(`${API_URL}/agents/${agentId}/users/${invitationId}`, { headers: getAuthHeaders() });
      loadUsers();
    } catch (e) {
      console.error('Failed to revoke access', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Invite section */}
      <div className="bg-card/60 border border-border/60 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-foreground text-sm mb-1">Invite People</h3>
        <p className="text-xs text-muted-foreground mb-4">Send an email invitation to collaborate on or use this agent.</p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            disabled={inviting}
            className="flex-1 min-w-0 rounded-xl border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:text-muted-foreground/50 transition-colors"
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
          />
          <div className="flex gap-2">
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as any)}
              disabled={inviting}
              className="rounded-xl border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              <option value="viewer">Viewer (Can chat)</option>
              <option value="editor">Editor (Chat + view stats)</option>
              <option value="admin">Admin (Full access)</option>
            </select>
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-0 shadow-sm shrink-0 min-w-[100px]" 
              onClick={handleInvite}
              disabled={inviting}
            >
              {inviting ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="border border-border/50 rounded-2xl overflow-hidden bg-card/40">
        <div className="px-5 py-4 border-b border-border/50 bg-muted/20">
          <h3 className="font-bold text-foreground text-sm">People with Access</h3>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Users size={20} className="text-muted-foreground/50" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">No one added yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Invited users will appear here. You can manage their permissions or revoke access at any time.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {users.map(user => (
              <div key={user.id} className={`flex items-center gap-4 p-4 ${user.status === 'revoked' ? 'opacity-50 grayscale' : ''}`}>
                
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-inner ${
                  user.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                  user.status === 'revoked' ? 'bg-muted text-muted-foreground' : 
                  'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  {user.invited_email[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{user.invited_email}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
                      user.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 
                      user.status === 'revoked' ? 'bg-destructive/10 text-destructive' : 
                      'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {user.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user.status === 'pending' ? `Invited ${new Date(user.invited_at).toLocaleDateString()}` : 
                       user.status === 'accepted' ? `Joined ${new Date(user.accepted_at!).toLocaleDateString()}` : ''}
                    </span>
                  </div>
                </div>

                {/* Controls */}
                {user.status !== 'revoked' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                      className="text-xs bg-transparent border-none text-muted-foreground hover:text-foreground font-medium focus-visible:outline-none cursor-pointer"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    
                    <button
                      onClick={() => handleRevoke(user.id)}
                      className="p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors ml-1"
                      title="Revoke access"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
  const opt = MODEL_OPTIONS.find(o => o.id === agent.model);

  const tabs: { id: ManageTab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'overview', label: 'Overview',    icon: <BarChart2 size={16} />, desc: 'Agent summary' },
    { id: 'share',    label: 'Share Links', icon: <Share2 size={16} />,    desc: 'Manage access links' },
    { id: 'users',    label: 'Users',       icon: <Users size={16} />,     desc: 'Private access' },
    { id: 'settings', label: 'Settings',    icon: <Settings size={16} />,  desc: 'Quick configuration' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Top bar ── */}
      <div className="h-14 flex items-center gap-4 px-6 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-20">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ArrowLeft size={17} />
        </button>
        <div className="h-5 w-px bg-border shrink-0" />
        {/* Agent avatar + name */}
        <div className={`w-7 h-7 rounded-lg ${agent.color || 'bg-blue-500'} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
          {opt?.icon || agent.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{agent.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">{agent.description}</p>
        </div>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold border-0 gap-1.5 h-8 text-xs px-3 shrink-0 shadow-sm"
          onClick={() => onOpenChat(agent)}
        >
          <MessageSquare size={13} /> Open Chat
        </Button>
        <Button
          variant="outline"
          className="font-bold border gap-1.5 h-8 text-xs px-3 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => onOpenBuilder(agent)}
        >
          <Pencil size={13} /> Edit Builder
        </Button>
      </div>

      {/* ── Body: sidebar + content ── */}
      <div className="flex flex-1 min-h-0">

        {/* Left sidebar nav */}
        <aside className="w-52 shrink-0 border-r border-border bg-card/40 flex flex-col py-4 gap-1 px-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all group ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className={`shrink-0 ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                {tab.icon}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{tab.label}</p>
                <p className="text-[10px] text-muted-foreground truncate leading-tight">{tab.desc}</p>
              </div>
            </button>
          ))}

          {/* Divider + Agent quick-stats */}
          <div className="mt-auto pt-4 border-t border-border mx-1 space-y-2">
            <div className="px-3 py-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Quick Info</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-semibold text-foreground truncate max-w-[80px] text-right">{opt?.label?.split(' ')[0] || agent.model}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Files</span>
                  <span className="font-semibold text-foreground">{agent.files?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8">
            {activeTab === 'overview' && <OverviewTab agent={agent} />}
            {activeTab === 'share'    && <ShareTab agentId={agent.id} />}
            {activeTab === 'users'    && <UsersTab agentId={agent.id} />}
            {activeTab === 'settings' && (
              <SettingsTab agent={agent} onSave={onSave} onOpenBuilder={onOpenBuilder} onDelete={onDelete} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AgentManagePage;

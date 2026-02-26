import React, { useState, useEffect } from 'react';
import { Plus, Copy, Check, Trash2, Power, PowerOff } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import CreateShareLinkModal from './CreateShareLinkModal';

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

interface ShareLinksListProps {
  agentId: string;
}

const ShareLinksList: React.FC<ShareLinksListProps> = ({ agentId }) => {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';

  useEffect(() => {
    loadShareLinks();
  }, [agentId]);

  const loadShareLinks = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('auth_token_session');
      const response = await axios.get(`${API_URL}/agents/${agentId}/share`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShareLinks(response.data);
    } catch (error) {
      console.error('Failed to load share links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleToggle = async (linkId: string) => {
    try {
      const token = sessionStorage.getItem('auth_token_session');
      await axios.patch(`${API_URL}/share/${linkId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadShareLinks();
    } catch (error) {
      console.error('Failed to toggle link:', error);
    }
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this share link?')) return;
    
    try {
      const token = sessionStorage.getItem('auth_token_session');
      await axios.delete(`${API_URL}/share/${linkId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadShareLinks();
    } catch (error) {
      console.error('Failed to delete link:', error);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-foreground">Share Links</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Create shareable links with custom access controls
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="h-8 text-xs px-3 bg-primary text-primary-foreground"
        >
          <Plus size={14} className="mr-1" />
          Create Link
        </Button>
      </div>

      {shareLinks.length === 0 ? (
        <div className="text-center py-8 bg-muted/30 rounded-lg border border-border border-dashed">
          <p className="text-xs text-muted-foreground font-medium">
            No share links created yet.
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="outline"
            className="mt-3 h-8 text-xs"
          >
            Create Your First Link
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {shareLinks.map((link) => (
            <div
              key={link.id}
              className="p-4 bg-card rounded-lg border border-border shadow-sm space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-foreground">
                      {link.name || 'Unnamed Link'}
                    </h4>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        link.link_type === 'public'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {link.link_type === 'public' ? '🌐 Public' : '🔒 Private'}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        link.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {link.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* URL */}
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg truncate border border-border font-mono">
                  {link.share_url}
                </code>
                <button
                  onClick={() => handleCopy(link.share_url, link.id)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Copy link"
                >
                  {copiedId === link.id ? (
                    <Check size={14} className="text-green-600" />
                  ) : (
                    <Copy size={14} className="text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  Uses: {link.current_uses} / {link.max_uses || '∞'}
                </span>
                <span>Expires: {formatDate(link.expires_at)}</span>
                <span>Created: {formatDate(link.created_at)}</span>
              </div>

              {/* Allowed Emails (for private links) */}
              {link.link_type === 'private' && link.allowed_emails.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Allowed Users:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {link.allowed_emails.map((email, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-[10px] bg-blue-50 text-blue-700 rounded font-medium"
                      >
                        {email}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => handleToggle(link.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-muted transition-colors"
                  title={link.is_active ? 'Deactivate' : 'Activate'}
                >
                  {link.is_active ? (
                    <>
                      <PowerOff size={12} />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Power size={12} />
                      Activate
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDelete(link.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete link"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateShareLinkModal
          agentId={agentId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadShareLinks();
          }}
        />
      )}
    </div>
  );
};

export default ShareLinksList;

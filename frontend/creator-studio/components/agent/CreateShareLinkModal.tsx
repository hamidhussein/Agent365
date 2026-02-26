import React, { useState } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface CreateShareLinkModalProps {
  agentId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateShareLinkModal: React.FC<CreateShareLinkModalProps> = ({
  agentId,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [linkType, setLinkType] = useState<'public' | 'private'>('public');
  const [maxUses, setMaxUses] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';

  const handleAddEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email format');
      return;
    }

    if (allowedEmails.includes(email)) {
      setError('Email already added');
      return;
    }

    setAllowedEmails([...allowedEmails, email]);
    setEmailInput('');
    setError(null);
  };

  const handleRemoveEmail = (email: string) => {
    setAllowedEmails(allowedEmails.filter((e) => e !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (linkType === 'private' && allowedEmails.length === 0) {
      setError('Private links require at least one allowed email');
      return;
    }

    try {
      setLoading(true);
      const token = sessionStorage.getItem('auth_token_session');

      const payload: any = {
        name: name.trim() || null,
        link_type: linkType,
        allowed_emails: linkType === 'private' ? allowedEmails : [],
      };

      if (maxUses) {
        payload.max_uses = parseInt(maxUses, 10);
      }

      if (expiresInDays) {
        payload.expires_in_days = parseInt(expiresInDays, 10);
      }

      await axios.post(`${API_URL}/agents/${agentId}/share`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      onSuccess();
    } catch (err: any) {
      console.error('Failed to create share link:', err);
      setError(err.response?.data?.detail || 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Create Share Link</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
              Link Name (Optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Client Demo, Marketing Campaign"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>

          {/* Link Type */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
              Link Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLinkType('public')}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  linkType === 'public'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                🌐 Public
              </button>
              <button
                type="button"
                onClick={() => setLinkType('private')}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  linkType === 'private'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                🔒 Private
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {linkType === 'public'
                ? 'Anyone with the link can access'
                : 'Only specified emails can access'}
            </p>
          </div>

          {/* Allowed Emails (for private links) */}
          {linkType === 'private' && (
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
                Allowed Emails
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEmail();
                    }
                  }}
                  placeholder="user@example.com"
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                />
                <Button
                  type="button"
                  onClick={handleAddEmail}
                  className="h-auto px-4 text-xs"
                >
                  Add
                </Button>
              </div>
              {allowedEmails.length > 0 && (
                <div className="space-y-1">
                  {allowedEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between p-2 bg-blue-50 rounded text-xs"
                    >
                      <span className="text-blue-700 font-medium">{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="text-blue-600 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Max Uses */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
              Max Uses (Optional)
            </label>
            <input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Unlimited"
              min="1"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Leave empty for unlimited uses
            </p>
          </div>

          {/* Expires In Days */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
              Expires In (Days)
            </label>
            <input
              type="number"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              placeholder="Never expires"
              min="1"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Leave empty for no expiration
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                'Create Link'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateShareLinkModal;

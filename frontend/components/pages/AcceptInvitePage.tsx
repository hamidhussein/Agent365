import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../../creator-studio/api';
import { getAuthToken } from '@/lib/auth/tokenStore';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${getAuthToken()}`
});

export default function AcceptInvitePage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your invitation...');
  
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid invitation link. No token provided.');
      return;
    }

    if (!isAuthenticated) {
      // Save current URL to redirect back after login
      sessionStorage.setItem('post_login_redirect', window.location.href);
      // Redirect to login
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }

    const acceptLink = async () => {
      try {
        setStatus('loading');
        const res = await axios.get(`${API_BASE}/api/invite/accept?token=${token}`, {
          headers: getAuthHeaders(),
        });
        
        setStatus('success');
        setMessage(res.data.message || 'Invitation accepted successfully!');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.detail || 'Failed to accept invitation. It may have expired or been revoked.');
      }
    };

    acceptLink();
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md p-8 rounded-3xl border border-border shadow-2xl text-center">
        
        {status === 'loading' && (
          <div className="py-8">
            <Loader2 size={48} className="animate-spin text-primary mx-auto mb-6" />
            <h1 className="text-xl font-bold text-foreground mb-2">Accepting Invitation</h1>
            <p className="text-muted-foreground">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <h1 className="text-2xl font-black text-foreground mb-3">You're In!</h1>
            <p className="text-muted-foreground mb-8 text-sm px-4">{message}</p>
            
            <Button 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-12 rounded-xl text-base gap-2"
              onClick={() => window.location.href = `/studio`}
            >
              Go to Dashboard <ArrowRight size={18} />
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={40} className="text-destructive" />
            </div>
            <h1 className="text-2xl font-black text-foreground mb-3">Invitation Error</h1>
            <p className="text-muted-foreground mb-8 text-sm px-4">{message}</p>
            
            <Button 
              variant="outline"
              className="w-full font-bold h-12 rounded-xl text-base"
              onClick={() => window.location.href = '/studio'}
            >
              Back to Dashboard
            </Button>
            
            <div className="mt-6 text-xs text-muted-foreground bg-muted/40 p-4 rounded-xl text-left">
              <p className="font-semibold mb-1">Make sure you are logged in with the correct email.</p>
              <p>You are currently logged in as: <span className="font-bold text-foreground">{user?.email || 'Unknown'}</span></p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

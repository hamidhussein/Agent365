import { FormEvent, useState } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export const AuthScreen = ({
  onAuth,
  error,
  onBrowseMarketplace
}: {
  onAuth: (payload: { email: string; password: string; remember: boolean; mode: 'login' | 'register' }) => void;
  error?: string | null;
  onBrowseMarketplace?: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    Promise.resolve(onAuth({ email, password, remember, mode })).finally(() => setLoading(false));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Background decorative blob */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-600/20 rounded-full blur-3xl"></div>

        <div className="text-center mb-8 relative z-10">
          <div className="w-16 h-16 bg-blue-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-900/50">
            <Bot size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">AgentGrid Platform</h1>
          <p className="text-slate-400">
            {mode === 'login' ? 'Sign in to manage your AI workforce.' : 'Create your account to get started.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10">
          <Input
            type="email"
            label="Email Address"
            placeholder="name@company.com"
            required
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            label="Password"
            placeholder="********"
            required
            value={password}
            onChange={(e: any) => setPassword(e.target.value)}
          />

          <div className="flex items-center justify-between mb-4 text-sm">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-blue-400 hover:text-blue-300"
            >
              {mode === 'login' ? 'Create account' : 'Back to sign in'}
            </button>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-300 bg-red-950/40 border border-red-900/60 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <Button className="w-full" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
          {onBrowseMarketplace && (
            <Button
              variant="outline"
              className="w-full mt-3"
              onClick={onBrowseMarketplace}
              type="button"
            >
              Browse Marketplace
            </Button>
          )}
        </form>

        <div className="mt-6 text-center text-sm text-slate-500 relative z-10">
          <p>Admin: <span className="text-slate-300">admin@agentgrid.ai</span></p>
          <p>Demo: <span className="text-slate-300">demo@agentgrid.ai</span></p>
        </div>
      </div>
    </div>
  );
};



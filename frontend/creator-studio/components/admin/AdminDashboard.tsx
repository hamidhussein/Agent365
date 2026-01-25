
import { useState } from 'react';
import { Shield, Users, Activity, Server, Zap, Key, Save, Lock, Eye, EyeOff, Globe, Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { LLMProviderConfig, PlatformSettings } from '../../types';
import { MODEL_OPTIONS } from '../../constants';

export const AdminDashboard = ({ 
  llmConfigs, 
  onUpdateConfig,
  onSave,
  assistModel,
  onUpdateAssistModel,
  platformSettings,
  onUpdatePlatformSettings
}: { 
  llmConfigs: LLMProviderConfig[], 
  onUpdateConfig: (id: string, updates: Partial<LLMProviderConfig>) => void,
  onSave: () => void,
  assistModel: string | null,
  onUpdateAssistModel: (model: string) => void,
  platformSettings: PlatformSettings,
  onUpdatePlatformSettings: (updates: Partial<PlatformSettings>) => void
}) => {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [showPlatformKeys, setShowPlatformKeys] = useState<Record<string, boolean>>({});
  const enabledProviders = new Set(
    llmConfigs
      .filter((config) => config.enabled && config.apiKey)
      .map((config) => config.provider)
  );

  const availableAssistModels = MODEL_OPTIONS.filter(
    (option) => enabledProviders.has(option.provider) && option.status !== 'coming-soon'
  );


  const toggleKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Admin Header Removed - Using Global App Header */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Welcome Section */}
        <div>
           <h1 className="text-2xl font-bold text-foreground mb-2">Platform Overview</h1>
           <p className="text-muted-foreground">Monitor system health and configure global LLM gateways.</p>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div className="bg-card/50 border border-border p-5 rounded-xl">
             <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">Active Creators</span>
                <Users size={16} className="text-primary" />
             </div>
             <div className="text-2xl font-bold text-foreground">248</div>
             <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
               <Activity size={12} /> +12% this week
             </div>
           </div>
           
           <div className="bg-card/50 border border-border p-5 rounded-xl">
             <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">Total Requests</span>
                <Server size={16} className="text-primary" />
             </div>
             <div className="text-2xl font-bold text-foreground">1.2M</div>
             <div className="text-xs text-muted-foreground mt-1">Last 30 days</div>
           </div>

           <div className="bg-card/50 border border-border p-5 rounded-xl">
             <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">API Cost Est.</span>
                <Zap size={16} className="text-amber-500" />
             </div>
             <div className="text-2xl font-bold text-foreground">$432.50</div>
             <div className="text-xs text-muted-foreground mt-1">Since billing cycle</div>
           </div>

           <div className="bg-card/50 border border-border p-5 rounded-xl">
             <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">System Status</span>
                <Activity size={16} className="text-green-600 dark:text-green-400" />
             </div>
             <div className="text-2xl font-bold text-green-600 dark:text-green-400">Healthy</div>
             <div className="text-xs text-muted-foreground mt-1">99.9% Uptime</div>
           </div>
        </div>

        {/* LLM Gateway Configuration */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
           <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-sm">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Key size={18} className="text-primary" /> LLM Gateway Configuration
                </h2>
                <p className="text-sm text-muted-foreground">Manage API keys and access for Creator Agents.</p>
              </div>
              <Button variant="outline" className="text-xs" onClick={onSave}>
                 <Save size={14} /> Save Changes
              </Button>
           </div>
           
           <div className="divide-y divide-border">
              {llmConfigs.map((config) => {
                 const modelOpt = MODEL_OPTIONS.find(m => m.provider === config.provider);
                 return (
                    <div key={config.id} className="p-6 transition-colors hover:bg-card/50">
                       <div className="flex flex-col md:flex-row md:items-start gap-6">
                          
                          {/* Provider Info */}
                          <div className="w-full md:w-64 shrink-0">
                             <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-foreground">
                                   {modelOpt?.icon || <Server />}
                                </div>
                                <div>
                                   <div className="font-semibold text-foreground">{config.name}</div>
                                   <div className={`text-xs inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${config.enabled ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-muted border-border text-muted-foreground'}`}>
                                      {config.enabled ? 'Enabled' : 'Disabled'}
                                   </div>
                                </div>
                             </div>
                             <p className="text-xs text-muted-foreground/80 mb-3">
                                Controls access to models like {modelOpt?.label || 'AI Models'}.
                             </p>
                             <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only" 
                                    checked={config.enabled} 
                                    onChange={(e) => onUpdateConfig(config.id, { enabled: e.target.checked })}
                                  />
                                  <div className={`block w-10 h-6 rounded-full transition-colors ${config.enabled ? 'bg-primary' : 'bg-muted'}`}></div>
                                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${config.enabled ? 'transform translate-x-4' : ''}`}></div>
                                </div>
                                <div className="ml-3 text-sm text-foreground/80 font-medium">
                                  Allow Creator Access
                                </div>
                             </label>
                          </div>

                          {/* Credentials & Limits */}
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">API Key (Server Side)</label>
                                <div className="relative">
                                   <input 
                                      type={showKeys[config.id] ? "text" : "password"}
                                      value={config.apiKey}
                                      onChange={(e) => onUpdateConfig(config.id, { apiKey: e.target.value })}
                                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-mono"
                                      placeholder={`sk-...${config.id}`}
                                   />
                                   <button 
                                      onClick={() => toggleKey(config.id)}
                                      className="absolute right-3 top-2.5 text-muted-foreground/80 hover:text-foreground"
                                   >
                                      {showKeys[config.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                   </button>
                                </div>
                                <p className="text-[10px] text-muted-foreground/80 mt-1 flex items-center gap-1">
                                   <Lock size={10} /> Stored in the local database. Never shared with frontend clients.
                                </p>
                             </div>

                             <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Monthly Spend Limit</label>
                                <div className="flex items-center gap-2">
                                   <span className="text-muted-foreground/80 text-sm">$</span>
                                   <input 
                                      type="number"
                                      value={config.limit}
                                      onChange={(e) => onUpdateConfig(config.id, { limit: parseInt(e.target.value) || 0 })}
                                      className="w-24 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none transition-all"
                                   />
                                   <span className="text-muted-foreground/80 text-sm">USD</span>
                                </div>
                                
                                <div className="mt-3">
                                   <div className="flex justify-between text-xs mb-1">
                                      <span className="text-muted-foreground">Current Usage ({config.usage}%)</span>
                                      <span className="text-foreground/80 font-mono">${(config.limit * (config.usage / 100)).toFixed(2)}</span>
                                   </div>
                                   <div className="w-full bg-muted rounded-full h-1.5">
                                      <div 
                                         className={`h-1.5 rounded-full ${config.usage > 90 ? 'bg-red-500' : config.usage > 75 ? 'bg-yellow-500' : 'bg-emerald-500'}`} 
                                         style={{ width: `${config.usage}%` }}
                                      ></div>
                                   </div>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 );
              })}
           </div>
        </div>

        {/* AI Assist Model */}
        <div className="bg-card/50 border border-border rounded-xl p-6 backdrop-blur-sm">
           <div className="flex items-center justify-between flex-wrap gap-3">
             <div>
               <h3 className="text-foreground font-semibold flex items-center gap-2 mb-1">AI Assist Model</h3>
               <p className="text-sm text-muted-foreground">Model used to generate agent descriptions and instructions.</p>
             </div>
             <Button variant="outline" className="text-xs" onClick={onSave}>
               <Save size={14} /> Refresh
             </Button>
           </div>
 
           {availableAssistModels.length === 0 ? (
             <p className="text-sm text-amber-600 dark:text-amber-400 mt-4">Enable a provider and add its API key to select an AI Assist model.</p>
           ) : (
             <div className="mt-4">
               <label className="block text-xs font-medium text-muted-foreground mb-2">Default model</label>
               <select
                 value={assistModel || ''}
                 onChange={(e) => onUpdateAssistModel(e.target.value)}
                 className="w-full max-w-md bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
               >
                 <option value="" disabled>Select a model</option>
                 {availableAssistModels.map((option) => (
                   <option key={option.id} value={option.id}>
                     {option.label}
                   </option>
                 ))}
               </select>
             </div>
           )}
        </div>

        {/* Platform Search & Connectivity */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mt-8 shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-sm">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Search size={18} className="text-green-600 dark:text-green-400" /> Platform Search & Connectivity
              </h2>
              <p className="text-sm text-muted-foreground">Configure professional search APIs for real-time agent capabilities.</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* SerpApi Section */}
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                    <Globe size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-foreground font-semibold">SerpApi (Google Search)</h3>
                    <p className="text-xs text-muted-foreground/80 mt-0.5">Recommended for high-quality organic search results.</p>
                    
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex justify-between">
                        <span>API Key</span>
                        <button 
                          onClick={() => setShowPlatformKeys(prev => ({ ...prev, serp: !prev.serp }))}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPlatformKeys['serp'] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </label>
                      <input 
                        type={showPlatformKeys['serp'] ? "text" : "password"}
                        value={platformSettings.SERPAPI_KEY || ''}
                        onChange={(e) => onUpdatePlatformSettings({ SERPAPI_KEY: e.target.value })}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none font-mono"
                        placeholder="sk-..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Custom Search Section */}
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Search size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-foreground font-semibold">Google Custom Search (JSON API)</h3>
                    <p className="text-xs text-muted-foreground/80 mt-0.5">Direct integration via Google Cloud Project.</p>
                    
                    <div className="mt-4 grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex justify-between">
                          <span>API Key</span>
                          <button 
                            onClick={() => setShowPlatformKeys(prev => ({ ...prev, google: !prev.google }))}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPlatformKeys['google'] ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </label>
                        <input 
                          type={showPlatformKeys['google'] ? "text" : "password"}
                          value={platformSettings.GOOGLE_SEARCH_API_KEY || ''}
                          onChange={(e) => onUpdatePlatformSettings({ GOOGLE_SEARCH_API_KEY: e.target.value })}
                          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none font-mono"
                          placeholder="AIza..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Search Engine ID (CX)</label>
                        <input 
                          type="text"
                          value={platformSettings.GOOGLE_SEARCH_CX || ''}
                          onChange={(e) => onUpdatePlatformSettings({ GOOGLE_SEARCH_CX: e.target.value })}
                          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none font-mono"
                          placeholder="0123...:abcd"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                platformSettings.SERPAPI_KEY || (platformSettings.GOOGLE_SEARCH_API_KEY && platformSettings.GOOGLE_SEARCH_CX)
                ? 'bg-green-500/5 border-green-500/10 text-green-600/90 dark:text-green-400/90'
                : 'bg-amber-500/5 border-amber-500/10 text-amber-600/90 dark:text-amber-400/90'
              }`}>
                <Activity size={16} />
                <span className="text-xs font-medium">
                  {platformSettings.SERPAPI_KEY || (platformSettings.GOOGLE_SEARCH_API_KEY && platformSettings.GOOGLE_SEARCH_CX)
                    ? 'Professional search providers are configured and active. DuckDuckGo will be used as fallback.'
                    : 'No professional search keys found. DuckDuckGo (Basic) will be used by all agents.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Settings Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-card/50 border border-border rounded-xl p-6 backdrop-blur-sm shadow-sm">
              <h3 className="text-foreground font-semibold flex items-center gap-2 mb-4">
                 <Globe size={18} className="text-primary" /> Compliance & Region
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                 Configure data residency and compliance standards for generated content.
              </p>
              <div className="flex gap-2">
                 <Button variant="outline" className="text-xs">Manage Regions</Button>
                 <Button variant="outline" className="text-xs">GDPR Settings</Button>
              </div>
           </div>
           
           <div className="bg-card/50 border border-border rounded-xl p-6 backdrop-blur-sm shadow-sm">
              <h3 className="text-foreground font-semibold flex items-center gap-2 mb-4">
                 <Shield size={18} className="text-red-500" /> Content Safety
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                 Set global safety filters for all creator agents (Hate speech, Harassment, etc).
              </p>
              <div className="flex gap-2">
                 <Button variant="outline" className="text-xs">Adjust Thresholds</Button>
              </div>
           </div>
        </div>

      </main>
    </div>
  );
};





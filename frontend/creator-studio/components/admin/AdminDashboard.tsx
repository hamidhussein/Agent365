
import { useState } from 'react';
import { Shield, Users, Activity, Server, Zap, Key, Save, Lock, Eye, EyeOff, Globe, Search, LogOut, Bot } from 'lucide-react';
import { Button } from '../ui/Button';
import { LLMProviderConfig, PlatformSettings } from '../../types';
import { MODEL_OPTIONS } from '../../constants';
import { Breadcrumbs } from '../shared/Breadcrumbs';
import { StudioHeader } from '../shared/StudioHeader';

export const AdminDashboard = ({ 
  llmConfigs, 
  onUpdateConfig,
  onSave,
  assistModel,
  onUpdateAssistModel,
  platformSettings,
  onUpdatePlatformSettings,
  onLogout
}: { 
  llmConfigs: LLMProviderConfig[], 
  onUpdateConfig: (id: string, updates: Partial<LLMProviderConfig>) => void,
  onSave: () => void,
  assistModel: string | null,
  onUpdateAssistModel: (model: string) => void,
  platformSettings: PlatformSettings,
  onUpdatePlatformSettings: (updates: Partial<PlatformSettings>) => void,
  onLogout?: () => void
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
    <div className="min-h-screen flex flex-col bg-background pb-12 relative overflow-hidden">
      {/* Premium Gradient Background Layer */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50 pointer-events-none" />

      <StudioHeader 
        left={
          <Breadcrumbs view="admin-dashboard" onNavigate={() => {}} className="py-0" />
        }
        right={
          <div className="flex items-center gap-3">
            {onLogout && (
              <Button onClick={onLogout} variant="outline" className="px-4 shadow-sm border-border bg-card/60 hover:bg-muted font-bold text-muted-foreground hover:text-foreground">
                <LogOut size={16} className="mr-2" /> Logout
              </Button>
            )}
            <Button onClick={onSave} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 shadow-lg shadow-primary/20 font-bold active:scale-[0.97] transition-all">
              <Save size={16} className="mr-2" /> Save Configuration
            </Button>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 w-full flex-1 relative z-10">
        
        {/* Welcome Section */}
        <div className="mb-10 text-center md:text-left">
             <h1 className="text-3xl font-black text-foreground mb-2 tracking-tight">Platform Overview</h1>
             <p className="text-muted-foreground text-lg">Monitor system health and configure global LLM gateways.</p>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="bg-card/40 border border-border/50 p-6 rounded-2xl backdrop-blur-xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Users size={48} className="text-primary" />
             </div>
             <div className="flex items-center justify-between mb-2 relative z-10">
                <span className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">Active Creators</span>
             </div>
             <div className="text-4xl font-black text-foreground tracking-tight relative z-10">248</div>
             <div className="text-xs font-medium text-emerald-500 flex items-center gap-1 mt-2 relative z-10">
               <Activity size={12} /> +12% this week
             </div>
           </div>
           
           <div className="bg-card/40 border border-border/50 p-6 rounded-2xl backdrop-blur-xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Server size={48} className="text-primary" />
             </div>
             <div className="flex items-center justify-between mb-2 relative z-10">
                <span className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">Total Requests</span>
             </div>
             <div className="text-4xl font-black text-foreground tracking-tight relative z-10">1.2M</div>
             <div className="text-xs font-medium text-muted-foreground mt-2 relative z-10">Last 30 days</div>
           </div>

           <div className="bg-card/40 border border-border/50 p-6 rounded-2xl backdrop-blur-xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Zap size={48} className="text-amber-500" />
             </div>
             <div className="flex items-center justify-between mb-2 relative z-10">
                <span className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">API Cost Est.</span>
             </div>
             <div className="text-4xl font-black text-foreground tracking-tight relative z-10">$432.50</div>
             <div className="text-xs font-medium text-muted-foreground mt-2 relative z-10">Since billing cycle</div>
           </div>

           <div className="bg-card/40 border border-border/50 p-6 rounded-2xl backdrop-blur-xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Activity size={48} className="text-emerald-500" />
             </div>
             <div className="flex items-center justify-between mb-2 relative z-10">
                <span className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">System Status</span>
             </div>
             <div className="text-4xl font-black text-emerald-500 tracking-tight drop-shadow-sm relative z-10">Healthy</div>
             <div className="text-xs font-medium text-emerald-500 mt-2 relative z-10">99.9% Uptime</div>
           </div>
        </div>

        {/* LLM Gateway Configuration */}
        <div className="bg-card/60 backdrop-blur-xl border border-border/60 rounded-2xl overflow-hidden shadow-sm">
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
                              <div className="flex items-center gap-3 mb-2 mt-1">
                                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${config.enabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                                    {modelOpt?.icon || <Server size={24} />}
                                 </div>
                                 <div>
                                    <div className="font-bold text-foreground text-base tracking-tight">{config.name}</div>
                                    <div className={`text-[10px] mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${config.enabled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-muted border-border text-muted-foreground'}`}>
                                       <span className={`w-1.5 h-1.5 rounded-full ${config.enabled ? 'bg-emerald-500' : 'bg-muted-foreground'}`}></span>
                                       {config.enabled ? 'Connected' : 'Disabled'}
                                    </div>
                                 </div>
                              </div>
                              <p className="text-xs font-medium text-muted-foreground/80 mb-5 leading-relaxed mt-4">
                                 Controls access to capabilities like {modelOpt?.label || 'General AI'}. Enabling this allows creators to use this provider.
                              </p>
                              
                              <label className="flex items-center cursor-pointer group/toggle w-max">
                                 <div className="relative">
                                   <input 
                                     type="checkbox" 
                                     className="sr-only" 
                                     checked={config.enabled} 
                                     onChange={(e) => onUpdateConfig(config.id, { enabled: e.target.checked })}
                                   />
                                   <div className={`block w-[44px] h-[24px] rounded-full transition-colors duration-300 shadow-inner ${config.enabled ? 'bg-emerald-500' : 'bg-muted border border-border/60'}`}></div>
                                   <div className={`absolute left-[3px] top-[3px] bg-white w-[18px] h-[18px] rounded-full transition-all duration-300 shadow-sm ${config.enabled ? 'transform translate-x-[20px]' : ''}`}></div>
                                 </div>
                                 <div className="ml-3 text-sm text-foreground font-semibold group-hover/toggle:text-primary transition-colors">
                                   Allow Access
                                 </div>
                              </label>
                           </div>

                           {/* Credentials & Limits */}
                           <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-1.5">
                                 <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">API Key (Server Side)</label>
                                 <div className="relative group/input">
                                    <input 
                                       type={showKeys[config.id] ? "text" : "password"}
                                       value={config.apiKey}
                                       onChange={(e) => onUpdateConfig(config.id, { apiKey: e.target.value })}
                                       className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground focus:bg-secondary focus:ring-2 focus:ring-primary/50 outline-none transition-all font-mono tracking-widest"
                                       placeholder={`sk-...${config.id}`}
                                    />
                                    <button 
                                       onClick={() => toggleKey(config.id)}
                                       className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground opacity-50 group-hover/input:opacity-100 transition-opacity"
                                    >
                                       {showKeys[config.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                 </div>
                                 <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 pt-1">
                                    <Lock size={10} /> Stored securely. Never shared with frontend clients.
                                 </p>
                              </div>

                              <div className="space-y-1.5">
                                 <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Monthly Spend Limit</label>
                                 <div className="flex items-center gap-2">
                                    <div className="flex-1 relative">
                                      <span className="absolute left-4 top-3 text-muted-foreground font-medium">$</span>
                                      <input 
                                          type="number"
                                          value={config.limit}
                                          onChange={(e) => onUpdateConfig(config.id, { limit: parseInt(e.target.value) || 0 })}
                                          className="w-full bg-secondary/50 border border-border/60 rounded-xl pl-8 pr-4 py-3 text-sm font-bold text-foreground focus:bg-secondary focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                      />
                                    </div>
                                    <span className="text-muted-foreground text-xs font-bold uppercase">USD</span>
                                 </div>
                                 
                                 <div className="mt-4 bg-secondary/30 p-3 rounded-xl border border-border/40">
                                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider mb-2">
                                       <span className="text-muted-foreground">Current Usage ({config.usage}%)</span>
                                       <span className="text-foreground">${(config.limit * (config.usage / 100)).toFixed(2)}</span>
                                    </div>
                                    <div className="w-full bg-muted/80 rounded-full h-2 overflow-hidden">
                                       <div 
                                          className={`h-full transition-all duration-1000 ${config.usage > 90 ? 'bg-red-500' : config.usage > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
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
         <div className="bg-card/60 border border-border/60 rounded-2xl p-6 backdrop-blur-xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Bot size={120} />
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3 relative z-10">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-1">AI Assist Model</h3>
                <p className="text-sm text-muted-foreground">Model used to generate agent descriptions and instructions.</p>
              </div>
              <Button variant="outline" className="text-xs font-bold bg-background/50 backdrop-blur-sm shadow-sm" onClick={onSave}>
                <Save size={14} className="mr-1.5" /> Refresh List
              </Button>
            </div>
  
            {availableAssistModels.length === 0 ? (
              <div className="mt-6 p-4 border border-amber-500/20 bg-amber-500/5 rounded-xl text-sm font-medium text-amber-600 dark:text-amber-400 flex items-start gap-3 relative z-10">
                <Activity size={18} className="shrink-0 mt-0.5" />
                <p>Enable a provider and add its API key above to select an AI Assist model.</p>
              </div>
            ) : (
              <div className="mt-8 relative z-10">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Default assist model</label>
                <select
                  value={assistModel || ''}
                  onChange={(e) => onUpdateAssistModel(e.target.value)}
                  className="w-full max-w-md bg-secondary/80 border border-border/80 rounded-xl px-4 py-3.5 text-sm font-medium text-foreground focus:bg-secondary focus:ring-2 focus:ring-primary/50 outline-none transition-all cursor-pointer shadow-sm appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`, paddingRight: `2.5rem` }}
                >
                  <option value="" disabled>Select a premium model</option>
                  {availableAssistModels.map((option) => (
                    <option key={option.id} value={option.id} className="bg-background text-foreground py-2 text-base">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
         </div>

         {/* Platform Search & Connectivity */}
         <div className="bg-card/60 backdrop-blur-xl border border-border/60 rounded-2xl overflow-hidden shadow-sm">
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
                   <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm">
                     <Globe size={24} />
                   </div>
                   <div className="flex-1">
                     <h3 className="text-lg font-bold text-foreground tracking-tight">SerpApi (Google Search)</h3>
                     <p className="text-xs font-medium text-muted-foreground/80 mt-1 leading-relaxed">Recommended for high-quality organic search results.</p>
                     
                     <div className="mt-5 space-y-1.5">
                       <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                         <span>API Key</span>
                         <button 
                           onClick={() => setShowPlatformKeys(prev => ({ ...prev, serp: !prev.serp }))}
                           className="text-muted-foreground hover:text-foreground transition-colors"
                         >
                           {showPlatformKeys['serp'] ? <EyeOff size={14} /> : <Eye size={14} />}
                         </button>
                       </label>
                       <input 
                         type={showPlatformKeys['serp'] ? "text" : "password"}
                         value={platformSettings.SERPAPI_KEY || ''}
                         onChange={(e) => onUpdatePlatformSettings({ SERPAPI_KEY: e.target.value })}
                         className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground focus:bg-secondary focus:ring-2 focus:ring-emerald-500/50 outline-none font-mono tracking-widest transition-all"
                         placeholder="sk-..."
                       />
                     </div>
                   </div>
                 </div>
               </div>

               {/* Google Custom Search Section */}
               <div className="space-y-4">
                 <div className="flex items-start gap-4">
                   <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm">
                     <Search size={24} />
                   </div>
                   <div className="flex-1">
                     <h3 className="text-lg font-bold text-foreground tracking-tight">Google Custom Search (JSON)</h3>
                     <p className="text-xs font-medium text-muted-foreground/80 mt-1 leading-relaxed">Direct integration via Google Cloud Project APIs.</p>
                     
                     <div className="mt-5 grid grid-cols-1 gap-4">
                       <div className="space-y-1.5">
                         <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                           <span>API Key</span>
                           <button 
                             onClick={() => setShowPlatformKeys(prev => ({ ...prev, google: !prev.google }))}
                             className="text-muted-foreground hover:text-foreground transition-colors"
                           >
                             {showPlatformKeys['google'] ? <EyeOff size={14} /> : <Eye size={14} />}
                           </button>
                         </label>
                         <input 
                           type={showPlatformKeys['google'] ? "text" : "password"}
                           value={platformSettings.GOOGLE_SEARCH_API_KEY || ''}
                           onChange={(e) => onUpdatePlatformSettings({ GOOGLE_SEARCH_API_KEY: e.target.value })}
                           className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground focus:bg-secondary focus:ring-2 focus:ring-primary/50 outline-none font-mono tracking-widest transition-all"
                           placeholder="AIza..."
                         />
                       </div>
                       <div className="space-y-1.5">
                         <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Search Engine ID (CX)</label>
                         <input 
                           type="text"
                           value={platformSettings.GOOGLE_SEARCH_CX || ''}
                           onChange={(e) => onUpdatePlatformSettings({ GOOGLE_SEARCH_CX: e.target.value })}
                           className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground focus:bg-secondary focus:ring-2 focus:ring-primary/50 outline-none font-mono tracking-widest transition-all"
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





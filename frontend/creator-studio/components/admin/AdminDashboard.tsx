
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
           <h1 className="text-2xl font-bold text-white mb-2">Platform Overview</h1>
           <p className="text-slate-400">Monitor system health and configure global LLM gateways.</p>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl">
             <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Active Creators</span>
                <Users size={16} className="text-blue-400" />
             </div>
             <div className="text-2xl font-bold text-white">248</div>
             <div className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
               <Activity size={12} /> +12% this week
             </div>
           </div>
           
           <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl">
             <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total Requests</span>
                <Server size={16} className="text-purple-400" />
             </div>
             <div className="text-2xl font-bold text-white">1.2M</div>
             <div className="text-xs text-slate-500 mt-1">Last 30 days</div>
           </div>

           <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl">
             <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">API Cost Est.</span>
                <Zap size={16} className="text-yellow-400" />
             </div>
             <div className="text-2xl font-bold text-white">$432.50</div>
             <div className="text-xs text-slate-500 mt-1">Since billing cycle</div>
           </div>

           <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl">
             <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">System Status</span>
                <Activity size={16} className="text-emerald-400" />
             </div>
             <div className="text-2xl font-bold text-emerald-400">Healthy</div>
             <div className="text-xs text-slate-500 mt-1">99.9% Uptime</div>
           </div>
        </div>

        {/* LLM Gateway Configuration */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
           <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/80">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Key size={18} className="text-blue-400" /> LLM Gateway Configuration
                </h2>
                <p className="text-sm text-slate-400">Manage API keys and access for Creator Agents.</p>
              </div>
              <Button variant="outline" className="text-xs" onClick={onSave}>
                 <Save size={14} /> Save Changes
              </Button>
           </div>
           
           <div className="divide-y divide-slate-700">
              {llmConfigs.map((config) => {
                 const modelOpt = MODEL_OPTIONS.find(m => m.provider === config.provider);
                 return (
                    <div key={config.id} className="p-6 transition-colors hover:bg-slate-800/50">
                       <div className="flex flex-col md:flex-row md:items-start gap-6">
                          
                          {/* Provider Info */}
                          <div className="w-full md:w-64 shrink-0">
                             <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-white">
                                   {modelOpt?.icon || <Server />}
                                </div>
                                <div>
                                   <div className="font-semibold text-white">{config.name}</div>
                                   <div className={`text-xs inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${config.enabled ? 'bg-emerald-900/30 border-emerald-800 text-emerald-400' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>
                                      {config.enabled ? 'Enabled' : 'Disabled'}
                                   </div>
                                </div>
                             </div>
                             <p className="text-xs text-slate-500 mb-3">
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
                                  <div className={`block w-10 h-6 rounded-full transition-colors ${config.enabled ? 'bg-blue-600' : 'bg-slate-600'}`}></div>
                                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${config.enabled ? 'transform translate-x-4' : ''}`}></div>
                                </div>
                                <div className="ml-3 text-sm text-slate-300 font-medium">
                                  Allow Creator Access
                                </div>
                             </label>
                          </div>

                          {/* Credentials & Limits */}
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">API Key (Server Side)</label>
                                <div className="relative">
                                   <input 
                                      type={showKeys[config.id] ? "text" : "password"}
                                      value={config.apiKey}
                                      onChange={(e) => onUpdateConfig(config.id, { apiKey: e.target.value })}
                                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none font-mono"
                                      placeholder={`sk-...${config.id}`}
                                   />
                                   <button 
                                      onClick={() => toggleKey(config.id)}
                                      className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                                   >
                                      {showKeys[config.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                   </button>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                   <Lock size={10} /> Stored in the local database. Never shared with frontend clients.
                                </p>
                             </div>

                             <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Monthly Spend Limit</label>
                                <div className="flex items-center gap-2">
                                   <span className="text-slate-500 text-sm">$</span>
                                   <input 
                                      type="number"
                                      value={config.limit}
                                      onChange={(e) => onUpdateConfig(config.id, { limit: parseInt(e.target.value) || 0 })}
                                      className="w-24 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none"
                                   />
                                   <span className="text-slate-500 text-sm">USD</span>
                                </div>
                                
                                <div className="mt-3">
                                   <div className="flex justify-between text-xs mb-1">
                                      <span className="text-slate-400">Current Usage ({config.usage}%)</span>
                                      <span className="text-slate-300 font-mono">${(config.limit * (config.usage / 100)).toFixed(2)}</span>
                                   </div>
                                   <div className="w-full bg-slate-700 rounded-full h-1.5">
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
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
           <div className="flex items-center justify-between flex-wrap gap-3">
             <div>
               <h3 className="text-white font-semibold flex items-center gap-2 mb-1">AI Assist Model</h3>
               <p className="text-sm text-slate-400">Model used to generate agent descriptions and instructions.</p>
             </div>
             <Button variant="outline" className="text-xs" onClick={onSave}>
               <Save size={14} /> Refresh
             </Button>
           </div>

           {availableAssistModels.length === 0 ? (
             <p className="text-sm text-amber-300 mt-4">Enable a provider and add its API key to select an AI Assist model.</p>
           ) : (
             <div className="mt-4">
               <label className="block text-xs font-medium text-slate-400 mb-2">Default model</label>
               <select
                 value={assistModel || ''}
                 onChange={(e) => onUpdateAssistModel(e.target.value)}
                 className="w-full max-w-md bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none"
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
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden mt-8 shadow-inner">
          <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/80">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Search size={18} className="text-emerald-400" /> Platform Search & Connectivity
              </h2>
              <p className="text-sm text-slate-400">Configure professional search APIs for real-time agent capabilities.</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* SerpApi Section */}
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-900/30 border border-emerald-800/50 flex items-center justify-center text-emerald-400 shrink-0">
                    <Globe size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">SerpApi (Google Search)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Recommended for high-quality organic search results.</p>
                    
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 flex justify-between">
                        <span>API Key</span>
                        <button 
                          onClick={() => setShowPlatformKeys(prev => ({ ...prev, serp: !prev.serp }))}
                          className="text-slate-500 hover:text-white transition-colors"
                        >
                          {showPlatformKeys['serp'] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </label>
                      <input 
                        type={showPlatformKeys['serp'] ? "text" : "password"}
                        value={platformSettings.SERPAPI_KEY || ''}
                        onChange={(e) => onUpdatePlatformSettings({ SERPAPI_KEY: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 outline-none font-mono"
                        placeholder="sk-..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Custom Search Section */}
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-900/30 border border-blue-800/50 flex items-center justify-center text-blue-400 shrink-0">
                    <Search size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">Google Custom Search (JSON API)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Direct integration via Google Cloud Project.</p>
                    
                    <div className="mt-4 grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5 flex justify-between">
                          <span>API Key</span>
                          <button 
                            onClick={() => setShowPlatformKeys(prev => ({ ...prev, google: !prev.google }))}
                            className="text-slate-500 hover:text-white transition-colors"
                          >
                            {showPlatformKeys['google'] ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </label>
                        <input 
                          type={showPlatformKeys['google'] ? "text" : "password"}
                          value={platformSettings.GOOGLE_SEARCH_API_KEY || ''}
                          onChange={(e) => onUpdatePlatformSettings({ GOOGLE_SEARCH_API_KEY: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none font-mono"
                          placeholder="AIza..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Search Engine ID (CX)</label>
                        <input 
                          type="text"
                          value={platformSettings.GOOGLE_SEARCH_CX || ''}
                          onChange={(e) => onUpdatePlatformSettings({ GOOGLE_SEARCH_CX: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none font-mono"
                          placeholder="0123...:abcd"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700/50">
              <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                platformSettings.SERPAPI_KEY || (platformSettings.GOOGLE_SEARCH_API_KEY && platformSettings.GOOGLE_SEARCH_CX)
                ? 'bg-emerald-900/20 border-emerald-800/30 text-emerald-400/90'
                : 'bg-amber-900/20 border-amber-800/30 text-amber-400/90'
              }`}>
                <Activity size={16} />
                <span className="text-xs">
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
           <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
                 <Globe size={18} className="text-blue-400" /> Compliance & Region
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                 Configure data residency and compliance standards for generated content.
              </p>
              <div className="flex gap-2">
                 <Button variant="outline" className="text-xs">Manage Regions</Button>
                 <Button variant="outline" className="text-xs">GDPR Settings</Button>
              </div>
           </div>
           
           <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
                 <Shield size={18} className="text-red-400" /> Content Safety
              </h3>
              <p className="text-sm text-slate-400 mb-4">
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





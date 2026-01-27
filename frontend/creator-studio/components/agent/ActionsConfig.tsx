import { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, Globe, Play, Loader2 } from 'lucide-react';
import { AgentActionPayload, AgentActionResponse } from '../../types';
import { agentsApi } from '../../api';
import { Button } from '../ui/Button';
import { Input, TextArea } from '../ui/Input';

interface ActionsConfigProps {
  agentId: string;
  actions: AgentActionResponse[];
  setActions: React.Dispatch<React.SetStateAction<AgentActionResponse[]>>;
}

export const ActionsConfig = ({ agentId, actions, setActions }: ActionsConfigProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [testingAction, setTestingAction] = useState<AgentActionResponse | null>(null);
  const [testParams, setTestParams] = useState('{}');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);

  const [formData, setFormData] = useState<AgentActionPayload>({
    name: '',
    description: '',
    url: '',
    method: 'POST',
    headers: {},
    openapi_spec: {}
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      url: '',
      method: 'POST',
      headers: {},
      openapi_spec: {}
    });
    setIsEditing(false);
    setEditingActionId(null);
    setTestingAction(null);
    setTestParams('{}');
    setTestResult(null);
  };

  const handleEdit = (action: AgentActionResponse) => {
    setFormData({
      name: action.name,
      description: action.description,
      url: action.url,
      method: action.method,
      headers: action.headers || {},
      openapi_spec: action.openapi_spec || {}
    });
    setEditingActionId(action.id);
    setIsEditing(true);
    setTestingAction(null);
  };

  const handleTest = (action: AgentActionResponse) => {
     setTestingAction(action);
     // Pre-fill params based on spec if available, otherwise empty dict
     const example = action.openapi_spec?.properties 
        ? Object.keys(action.openapi_spec.properties).reduce((acc: any, key) => {
            acc[key] = "value";
            return acc;
        }, {})
        : {};
     setTestParams(JSON.stringify(example, null, 2));
     setTestResult(null);
     setIsEditing(false);
  };

  const runTest = async () => {
      if (!testingAction) return;
      setIsRunningTest(true);
      setTestResult(null);
      try {
          let params = {};
          try {
              params = JSON.parse(testParams);
          } catch (e) {
              alert("Invalid JSON parameters");
              setIsRunningTest(false);
              return;
          }

          const result = await agentsApi.testAction(agentId, testingAction.id, params);
          setTestResult(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
      } catch (error: any) {
          setTestResult(`Error: ${error.message || 'Test failed'}`);
      } finally {
          setIsRunningTest(false);
      }
  };

  const handleDelete = async (actionId: string) => {
    if (!confirm('Are you sure you want to delete this action?')) return;
    try {
      await agentsApi.deleteAction(agentId, actionId);
      setActions(prev => prev.filter(a => a.id !== actionId));
    } catch (error) {
      console.error('Failed to delete action:', error);
      alert('Failed to delete action');
    }
  };

  const handleSave = async () => {
    try {
      if (editingActionId) {
        const updated = await agentsApi.updateAction(agentId, editingActionId, formData);
        setActions(prev => prev.map(a => a.id === editingActionId ? updated : a));
      } else {
        const created = await agentsApi.createAction(agentId, formData);
        setActions(prev => [...prev, created]);
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save action:', error);
      alert('Failed to save action');
    }
  };

  // Helper to manage key-value pairs for headers
  const updateHeader = (key: string, value: string, oldKey?: string) => {
    const newHeaders = { ...formData.headers };
    if (oldKey && oldKey !== key) {
      delete newHeaders[oldKey];
    }
    if (key) newHeaders[key] = value;
    setFormData(prev => ({ ...prev, headers: newHeaders }));
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...formData.headers };
    delete newHeaders[key];
    setFormData(prev => ({ ...prev, headers: newHeaders }));
  };

  return (
    <div className="space-y-6">
      
      {!isEditing && !testingAction ? (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300">Configured Actions</h3>
                <Button onClick={() => setIsEditing(true)} variant="outline" className="h-8 text-xs border-dashed border-slate-600 hover:border-blue-500 hover:text-blue-400">
                    <Plus size={14} className="mr-1" /> Add Action
                </Button>
            </div>
            
            {actions.length === 0 && (
                <div className="text-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                    <Globe className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                    <p className="text-sm text-slate-500">No actions configured. Add an API to give your agent superpowers.</p>
                </div>
            )}

            <div className="grid gap-3">
                {actions.map(action => (
                    <div key={action.id} className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center justify-between group hover:border-slate-700 transition-all">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                action.method === 'GET' ? 'bg-blue-500/10 text-blue-400' :
                                action.method === 'POST' ? 'bg-emerald-500/10 text-emerald-400' :
                                'bg-orange-500/10 text-orange-400'
                            }`}>
                                {action.method}
                            </div>
                            <div>
                                <div className="text-sm font-medium text-slate-200">{action.name}</div>
                                <div className="text-xs text-slate-500 font-mono truncate max-w-[200px]">{action.url}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleTest(action)} className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg text-xs font-bold mr-2">
                                <Play size={12} /> Test
                            </button>
                            <button onClick={() => handleEdit(action)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg">
                                <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(action.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      ) : testingAction ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Play size={16} className="text-purple-400" /> 
                      Test Action: <span className="text-purple-300">{testingAction.name}</span>
                  </h3>
                  <Button variant="ghost" onClick={resetForm} className="h-8 text-xs text-slate-400">Close</Button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                     <div>
                         <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Input Parameters (JSON)</label>
                         <TextArea 
                            rows={10} 
                            value={testParams} 
                            onChange={(e: any) => setTestParams(e.target.value)} 
                            className="font-mono text-xs bg-slate-900 border-slate-700"
                         />
                     </div>
                     <Button 
                        onClick={runTest} 
                        disabled={isRunningTest}
                        className="w-full bg-purple-600 hover:bg-purple-500 font-bold"
                     >
                        {isRunningTest ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} className="mr-2" />} 
                        Run Test
                     </Button>
                 </div>
                 
                 <div className="flex flex-col h-full min-h-[300px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                     <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                         Response
                     </div>
                     <div className="flex-1 p-4 overflow-auto">
                         {testResult ? (
                             <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap break-all">
                                 {testResult}
                             </pre>
                         ) : (
                             <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                                 <Globe size={24} className="opacity-20" />
                                 <p className="text-xs">Run the test to see the API response here.</p>
                             </div>
                         )}
                     </div>
                 </div>
             </div>
          </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
           <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {editingActionId ? <Edit2 size={16} /> : <Plus size={16} />} 
                    {editingActionId ? 'Edit Action' : 'New Action'}
                </h3>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={resetForm} className="h-8 text-xs text-slate-400">Cancel</Button>
                    <Button onClick={handleSave} className="h-8 text-xs bg-blue-600 hover:bg-blue-500">
                        <Save size={14} className="mr-1" /> Save
                    </Button>
                </div>
           </div>

           <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                   <Input 
                        label="Action Name (snake_case)" 
                        placeholder="get_weather" 
                        value={formData.name} 
                        onChange={(e: any) => setFormData(prev => ({ ...prev, name: e.target.value }))} 
                   />
                   <div>
                       <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">HTTP Method</label>
                       <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                           {['GET', 'POST', 'PUT', 'DELETE'].map(m => (
                               <button 
                                   key={m}
                                   onClick={() => setFormData(prev => ({ ...prev, method: m as any }))}
                                   className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${
                                       formData.method === m ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                                   }`}
                               >
                                   {m}
                               </button>
                           ))}
                       </div>
                   </div>
               </div>

               <Input 
                   label="Description (for AI)" 
                   placeholder="Fetches the current weather for a given city..." 
                   value={formData.description} 
                   onChange={(e: any) => setFormData(prev => ({ ...prev, description: e.target.value }))} 
               />

               <Input 
                   label="API Endpoint URL" 
                   placeholder="https://api.example.com/v1/resource" 
                   value={formData.url} 
                   onChange={(e: any) => setFormData(prev => ({ ...prev, url: e.target.value }))} 
               />
               
               {/* Headers Editor */}
               <div>
                   <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Headers (Auth)</label>
                   <div className="space-y-2">
                       {Object.entries(formData.headers || {}).map(([key, value]) => (
                           <div key={key} className="flex gap-2">
                               <input 
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
                                    value={key}
                                    onChange={(e) => updateHeader(e.target.value, value as string, key)}
                                    placeholder="Header-Name"
                               />
                               <input 
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
                                    value={value as string}
                                    onChange={(e) => updateHeader(key, e.target.value)}
                                    placeholder="Value"
                                    type="password"
                               />
                               <button onClick={() => removeHeader(key)} className="text-slate-500 hover:text-red-400 px-2"><X size={14} /></button>
                           </div>
                       ))}
                       <button 
                            onClick={() => updateHeader('', '')}
                            className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 mt-1"
                       >
                           <Plus size={12} /> Add Header
                       </button>
                   </div>
               </div>
               
               {/* OpenAPI Spec */}
               <TextArea 
                    label="Parameters (OpenAPI Spec JSON)" 
                    rows={6} 
                    className="font-mono text-xs"
                    value={JSON.stringify(formData.openapi_spec, null, 2)}
                    onChange={(e: any) => {
                        try {
                            const parsed = JSON.parse(e.target.value);
                            setFormData(prev => ({ ...prev, openapi_spec: parsed }));
                        } catch {
                            // Allow typing invalid json, but don't parse
                        }
                    }}
               />
           </div>
        </div>
      )}
    </div>
  );
};

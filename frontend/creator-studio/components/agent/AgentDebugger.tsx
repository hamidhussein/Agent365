import { Terminal, Activity, Bug, CheckCircle, XCircle } from 'lucide-react';

export interface DebugLog {
  id: string;
  timestamp: string;
  type: 'info' | 'thought' | 'tool_call' | 'tool_result' | 'error' | 'success';
  content: string;
  metadata?: any;
}

interface AgentDebuggerProps {
  logs: DebugLog[];
  isThinking: boolean;
}

export const AgentDebugger = ({ logs, isThinking }: AgentDebuggerProps) => {
  return (
    <div className="flex flex-col h-full bg-muted/30 border border-border rounded-xl overflow-hidden font-mono text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-secondary border-b border-border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Terminal size={14} />
          <span className="text-xs font-bold uppercase tracking-wider">Live Debugger</span>
        </div>
        <div className="flex items-center gap-2">
          {isThinking && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] text-blue-600">
              <Activity size={10} className="animate-pulse" />
              PROCESSING
            </div>
          )}
          <div className="text-[10px] text-muted-foreground/70">
            {logs.length} events
          </div>
        </div>
      </div>

      {/* Logs Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-card/50">
        {logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 gap-2">
            <Bug size={32} />
            <p className="text-xs">Waiting for agent activity...</p>
          </div>
        )}

        {logs.map((log) => (
          <div key={log.id} className="animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="flex items-start gap-3 group">
              {/* Timestamp & Icon */}
              <div className="flex flex-col items-center gap-1 mt-0.5 shrink-0 w-8">
                <span className="text-[9px] text-muted-foreground">{log.timestamp}</span>
                {log.type === 'thought' && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                {log.type === 'tool_call' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                {log.type === 'tool_result' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                {log.type === 'error' && <XCircle size={10} className="text-red-500" />}
                {log.type === 'success' && <CheckCircle size={10} className="text-emerald-500" />}
                {log.type === 'info' && <div className="w-1 h-1 rounded-full bg-muted-foreground" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className={`p-2 rounded border text-xs leading-relaxed break-words ${log.type === 'thought' ? 'bg-purple-50 border-purple-100 text-purple-700' :
                    log.type === 'tool_call' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                      log.type === 'tool_result' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                        log.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' :
                          log.type === 'success' ? 'bg-emerald-50 border-green-100 text-green-700' :
                            'text-muted-foreground border-transparent'
                  }`}>
                  {log.type === 'tool_call' && <span className="block mb-1 text-[9px] font-bold uppercase opacity-70">Tool Call</span>}
                  {log.type === 'tool_result' && <span className="block mb-1 text-[9px] font-bold uppercase opacity-70">Output</span>}
                  {log.type === 'thought' && <span className="block mb-1 text-[9px] font-bold uppercase opacity-70">Thinking</span>}

                  {log.content}

                  {log.metadata && (
                    <pre className="mt-2 text-[9px] p-1.5 bg-background rounded border border-border overflow-x-auto text-muted-foreground">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

import { useEffect, useRef } from 'react';
import { Terminal, Activity, XCircle, CheckCircle2, Wrench, Lightbulb, Info } from 'lucide-react';

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

const LOG_CONFIG: Record<DebugLog['type'], {
  dot: string;
  bg: string;
  border: string;
  text: string;
  label: string;
  Icon: any;
}> = {
  thought: {
    dot: 'bg-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    text: 'text-violet-300',
    label: 'Thinking',
    Icon: Lightbulb,
  },
  tool_call: {
    dot: 'bg-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    text: 'text-sky-300',
    label: 'Tool Call',
    Icon: Wrench,
  },
  tool_result: {
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-300',
    label: 'Output',
    Icon: CheckCircle2,
  },
  error: {
    dot: 'bg-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-300',
    label: 'Error',
    Icon: XCircle,
  },
  success: {
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-300',
    label: 'Success',
    Icon: CheckCircle2,
  },
  info: {
    dot: 'bg-zinc-500',
    bg: 'bg-zinc-700/30',
    border: 'border-zinc-700/40',
    text: 'text-zinc-400',
    label: 'Info',
    Icon: Info,
  },
};

export const AgentDebugger = ({ logs, isThinking }: AgentDebuggerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden font-mono text-sm border border-zinc-700/60"
      style={{ background: 'hsl(220 15% 10%)' }}
    >
      {/* ── Terminal Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-700/60 shrink-0"
        style={{ background: 'hsl(220 15% 8%)' }}
      >
        <div className="flex items-center gap-3">
          {/* Traffic-light dots */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <Terminal size={12} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Live Debugger</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isThinking && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 rounded text-[10px] text-sky-400">
              <Activity size={9} className="animate-pulse" />
              PROCESSING
            </div>
          )}
          <div className="text-[9px] text-zinc-600">
            {logs.length} event{logs.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* ── Log Area ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
            <div className="text-center space-y-2">
              <p className="text-xs font-semibold text-zinc-500">Waiting for agent activity</p>
              {/* Blinking cursor */}
              <div className="flex items-center justify-center gap-1 text-emerald-500 font-mono text-sm">
                <span className="text-zinc-500">$</span>
                <span className="w-2 h-4 bg-emerald-500/80 animate-pulse inline-block rounded-sm" />
              </div>
            </div>
          </div>
        )}

        {logs.map((log) => {
          const cfg = LOG_CONFIG[log.type];
          const Icon = cfg.Icon;
          return (
            <div key={log.id} className="animate-in fade-in slide-in-from-bottom-1 duration-200">
              <div className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                {/* Icon + timestamp */}
                <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                  <Icon size={11} className={cfg.text} />
                  <span className="text-[8px] text-zinc-600 whitespace-nowrap">{log.timestamp}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${cfg.text} opacity-70`}>
                    {cfg.label}
                  </span>
                  <p className={`text-xs leading-relaxed break-words ${cfg.text}`}>
                    {log.content}
                  </p>
                  {log.metadata && (
                    <pre className="mt-2 text-[9px] p-2 bg-black/40 rounded border border-zinc-700/60 overflow-x-auto text-zinc-400">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { 
  BarChart, 
  Clock, 
  Target, 
  Star, 
  TrendingUp, 
  Activity,
  Award,
  ArrowUpRight
} from 'lucide-react';
import { ExpertAnalytics } from '@/lib/types';

type MetricColor = 'blue' | 'amber' | 'green' | 'primary';

const metricColors: Record<MetricColor, { glow: string; badge: string; text: string }> = {
  blue: { glow: 'bg-blue-500/5', badge: 'bg-blue-500/10', text: 'text-blue-500' },
  amber: { glow: 'bg-amber-500/5', badge: 'bg-amber-500/10', text: 'text-amber-500' },
  green: { glow: 'bg-green-500/5', badge: 'bg-green-500/10', text: 'text-green-500' },
  primary: { glow: 'bg-primary/10', badge: 'bg-primary/20', text: 'text-primary' },
};

const MetricCard: React.FC<{
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  color: MetricColor;
}> = ({ label, value, subValue, icon, color }) => {
  const palette = metricColors[color];
  return (
    <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
      <div className={`absolute top-0 right-0 w-32 h-32 ${palette.glow} rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-all duration-700`}></div>
      <div className="flex items-center gap-4 relative z-10">
        <div className={`w-12 h-12 rounded-2xl ${palette.badge} flex items-center justify-center ${palette.text}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-black text-foreground tracking-tighter">{value}</p>
          {subValue && <span className="text-[10px] font-bold text-muted-foreground/60">{subValue}</span>}
        </div>
      </div>
    </div>
  </div>
  );
};

const ReviewAnalytics: React.FC = () => {
  const { data: analyticsResponse, isLoading, isError } = useQuery({
    queryKey: ['expert-analytics'],
    queryFn: () => api.executions.getAnalytics(),
  });

  const analytics = analyticsResponse?.data;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-3xl"></div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-card border border-border/50 rounded-3xl p-10 text-center shadow-sm">
        <h3 className="text-xl font-black text-foreground mb-2">Insights unavailable</h3>
        <p className="text-muted-foreground text-sm">We couldn't load expert analytics right now.</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-card border border-border/50 rounded-3xl p-10 text-center shadow-sm">
        <h3 className="text-xl font-black text-foreground mb-2">No analytics yet</h3>
        <p className="text-muted-foreground text-sm">Verify a few runs to unlock insights.</p>
      </div>
    );
  }

  const { overview } = analytics;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          label="Resolution Rate"
          value={`${overview.resolution_rate_percent}%`}
          subValue="of total requests"
          icon={<Target size={24} />}
          color="blue"
        />
        <MetricCard 
          label="Avg Resp Time"
          value={`${overview.avg_resolution_time_hours}h`}
          subValue="per review"
          icon={<Clock size={24} />}
          color="amber"
        />
        <MetricCard 
          label="SLA Compliance"
          value={`${overview.sla_compliance_rate}%`}
          subValue="on-time delivery"
          icon={<Award size={24} />}
          color="green"
        />
        <MetricCard 
          label="Quality Score"
          value={`${overview.avg_quality_score}/5`}
          subValue="avg verification"
          icon={<Star size={24} />}
          color="primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* By Agent Table */}
        <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <BarChart className="text-primary" />
              <h3 className="text-lg font-black text-foreground uppercase tracking-widest">Agent Performance</h3>
            </div>
            <button
              type="button"
              disabled
              className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 text-muted-foreground/60 cursor-not-allowed"
              title="Coming soon"
            >
              Full Report <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="space-y-6">
            {analytics.by_agent.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                No agent review data yet.
              </div>
            ) : (
              analytics.by_agent.map((agent) => (
                <div key={agent.agent_id} className="flex items-center justify-between group">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{agent.agent_name}</span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{agent.total_requests} requests</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-black text-foreground">{agent.avg_score.toFixed(1)}</p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <div key={s} className={`w-1.5 h-1.5 rounded-full ${s <= agent.avg_score ? 'bg-primary' : 'bg-muted'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Trend Placeholder / More metrics */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 flex flex-col justify-center items-center text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <Activity className="w-16 h-16 text-primary/20 mb-6 group-hover:scale-110 transition-transform duration-500" />
          <h3 className="text-2xl font-black text-white tracking-tight mb-2">Advanced Insights</h3>
          <p className="text-muted-foreground text-sm max-w-xs leading-relaxed lowercase font-medium italic">
             more comparative analytics and historical trends will appear here as you verify more runs.
          </p>
          <div className="mt-8 flex gap-2">
             <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black text-primary uppercase tracking-widest">
                Real-time
             </div>
             <div className="px-4 py-2 bg-secondary border border-border/50 rounded-full text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Optimized
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewAnalytics;


import React from 'react';
import { BotIcon, ZapIcon, DollarSignIcon, StarIcon } from '../icons/Icons';

interface CreatorStatsProps {
  stats: {
    totalAgents: number;
    totalRuns: number;
    totalEarnings: number;
    avgRating: number;
  };
}

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; }> = ({ icon, label, value }) => (
  <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
    <div className="flex items-center space-x-4">
      <div className="flex-shrink-0 text-primary">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  </div>
);

const CreatorStats: React.FC<CreatorStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={<BotIcon className="h-8 w-8" />}
        label="Total Agents"
        value={stats.totalAgents.toLocaleString()}
      />
      <StatCard
        icon={<ZapIcon className="h-8 w-8" />}
        label="Total Runs"
        value={stats.totalRuns.toLocaleString()}
      />
      <StatCard
        icon={<DollarSignIcon className="h-8 w-8" />}
        label="Total Earnings"
        value={`$${stats.totalEarnings.toLocaleString()}`}
      />
      <StatCard
        icon={<StarIcon className="h-8 w-8 text-yellow-400" />}
        label="Average Rating"
        value={stats.avgRating.toString()}
      />
    </div>
  );
};

export default CreatorStats;
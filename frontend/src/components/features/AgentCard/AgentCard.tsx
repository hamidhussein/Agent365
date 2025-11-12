import { memo, useRef } from 'react';
import { Agent } from '@/lib/types';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Star, TrendingUp, Clock, Play, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIntersectionObserver } from '@/lib/hooks';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

export type AgentCardVariant = 'default' | 'compact' | 'featured';

export interface AgentCardProps {
  agent: Agent;
  variant?: AgentCardVariant;
  onExecute?: (agent: Agent) => void;
  onViewDetails?: (agent: Agent) => void;
  className?: string;
}

function AgentCardComponent({
  agent,
  variant = 'default',
  onExecute,
  onViewDetails,
  className,
}: AgentCardProps) {
  const isCompact = variant === 'compact';
  const isFeatured = variant === 'featured';
  const showDemoBadge = agent.demo_available;

  const handleExecute = () => {
    onExecute?.(agent);
  };

  const handleViewDetails = () => {
    onViewDetails?.(agent);
  };
  const cardRef = useRef<HTMLDivElement>(null);
  const entry = useIntersectionObserver(cardRef, {
    threshold: 0.2,
    freezeOnceVisible: true,
  });
  const isVisible = entry?.isIntersecting;

  return (
    <Card
      ref={cardRef}
      className={cn(
        'group transition-all duration-500 hover:shadow-lg relative overflow-hidden',
        isFeatured && 'border-primary border-2 shadow-xl',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
    >
      {isFeatured && (
        <div className="absolute top-4 right-4 z-10">
          <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
            Featured
          </span>
        </div>
      )}

      <CardHeader className={cn(isCompact ? 'p-4' : 'p-6')}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">{agent.name}</CardTitle>
            <CardDescription>{agent.description}</CardDescription>
          </div>
          {showDemoBadge && (
            <span className="text-xs font-semibold text-success bg-success/10 px-2 py-1 rounded-full">
              Demo
            </span>
          )}
        </div>
      </CardHeader>

      <div
        className={cn(
          'w-full bg-muted flex items-center justify-center overflow-hidden',
          isCompact ? 'h-32' : 'h-48'
        )}
      >
        {agent.thumbnail_url ? (
          <OptimizedImage
            src={agent.thumbnail_url}
            alt={agent.name}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300 rounded-none"
          />
        ) : (
          <div className="text-4xl font-bold text-primary/30">
            {agent.name.charAt(0)}
          </div>
        )}
      </div>

      <CardContent className={cn('space-y-4', isCompact ? 'p-4' : 'p-6')}>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1 font-medium text-foreground">
            <Star className="w-4 h-4 text-yellow-400" aria-hidden="true" />
            <span>{agent.rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">
              ({agent.total_reviews} reviews)
            </span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" aria-hidden="true" />
            <span>{agent.total_runs.toLocaleString()} runs</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span>{agent.config.timeout_seconds}s timeout</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {agent.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground capitalize"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Category</span>
            <span className="font-semibold capitalize">{agent.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="font-semibold">{agent.version}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className={cn('flex flex-col gap-2', isCompact ? 'p-4' : 'p-6')}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Price per run</span>
          <span className="text-lg font-bold text-primary">
            {agent.price_per_run} credits
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleExecute}>
            <Play className="w-4 h-4 mr-2" aria-hidden="true" />
            Run Agent
          </Button>
          <Button variant="outline" onClick={handleViewDetails}>
            <BookOpen className="w-4 h-4 mr-2" aria-hidden="true" />
            Details
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export const AgentCard = memo(AgentCardComponent);

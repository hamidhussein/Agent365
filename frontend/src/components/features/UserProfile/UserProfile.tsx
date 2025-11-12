'use client';

import type { ComponentType } from 'react';
import { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  CreditCard,
  Mail,
  UserRound,
  Settings,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { sanitizeHTML } from '@/lib/utils';

export type UserProfileVariant = 'full' | 'compact';

export interface UserProfileProps {
  user: User;
  variant?: UserProfileVariant;
  onEditProfile?: () => void;
  onLogout?: () => void;
  onAddCredits?: () => void;
  className?: string;
}

const roleCopy: Record<string, string> = {
  user: 'Agent Explorer',
  creator: 'Agent Creator',
  admin: 'Platform Admin',
};

export function UserProfile({
  user,
  variant = 'full',
  onEditProfile,
  onLogout,
  onAddCredits,
  className,
}: UserProfileProps) {
  const displayRole = roleCopy[user.role] || user.role;
  const safeBio = user.bio ? sanitizeHTML(user.bio) : null;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/30">
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
          <div className="flex flex-col items-center gap-3 md:flex-row md:gap-4">
            <AvatarFallback name={user.full_name || user.username} src={user.avatar_url} />
            <div>
              <CardTitle className="text-2xl">{user.full_name || user.username}</CardTitle>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2 md:justify-start">
                <Sparkles className="w-4 h-4 text-primary" />
                {displayRole}
              </p>
            </div>
          </div>
          {variant === 'full' && (
            <div className="flex gap-2 w-full justify-center md:justify-end">
              <Button variant="outline" onClick={onEditProfile}>
                <Settings className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
              <Button variant="destructive" onClick={onLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <InfoTile
            icon={Mail}
            label="Email"
            value={user.email}
          />
          <InfoTile
            icon={UserRound}
            label="Username"
            value={`@${user.username}`}
          />
          <div className="rounded-lg border p-4 bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="text-2xl font-bold">{user.credits.toLocaleString()}</p>
              </div>
              <CreditCard className="w-8 h-8 text-primary" />
            </div>
            <Button className="mt-4 w-full" onClick={onAddCredits}>
              Recharge Credits
            </Button>
          </div>
        </div>

        {variant === 'full' && safeBio && (
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground mb-2">About</p>
            <p
              className="text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: safeBio }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AvatarFallback({ name, src }: { name: string; src?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="h-20 w-20 rounded-full object-cover border-4 border-background"
        loading="lazy"
      />
    );
  }

  return (
    <div className="h-20 w-20 rounded-full bg-primary/20 text-primary flex items-center justify-center text-2xl font-semibold border-4 border-background">
      {name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()}
    </div>
  );
}

interface InfoTileProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function InfoTile({ icon: Icon, label, value }: InfoTileProps) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-sm font-semibold text-foreground break-words">{value}</p>
    </div>
  );
}

# AgentGrid V0 Frontend Refactoring Guide - Part 2
## Steps 11-20: Features, Performance & Quality

**This is a continuation of the main refactoring guide. Complete Steps 1-10 first.**

---

## 🎨 STEP 11: FEATURE COMPONENTS

### Create `src/components/features/AgentCard/AgentCard.tsx`
```typescript
'use client';

import { Agent } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Star, TrendingUp, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface AgentCardProps {
  agent: Agent;
  variant?: 'default' | 'compact' | 'featured';
  onExecute?: (agent: Agent) => void;
}

export function AgentCard({ agent, variant = 'default', onExecute }: AgentCardProps) {
  const isCompact = variant === 'compact';
  const isFeatured = variant === 'featured';

  return (
    <Card
      className={cn(
        'group hover:shadow-lg transition-all duration-300',
        isFeatured && 'border-primary border-2',
        'relative overflow-hidden'
      )}
    >
      {/* Featured Badge */}
      {isFeatured && (
        <div className="absolute top-4 right-4 z-10">
          <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
            Featured
          </span>
        </div>
      )}

      {/* Thumbnail */}
      <div className={cn('relative overflow-hidden bg-muted', isCompact ? 'h-32' : 'h-48')}>
        {agent.thumbnail_url ? (
          <Image
            src={agent.thumbnail_url}
            alt={agent.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <div className="text-4xl font-bold text-primary/30">
              {agent.name.charAt(0)}
            </div>
          </div>
        )}
        
        {/* Category Badge */}
        <div className="absolute bottom-2 left-2">
          <span className="glass-effect px-2 py-1 text-xs font-medium rounded">
            {agent.category}
          </span>
        </div>
      </div>

      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link href={`/agents/${agent.id}`}>
              <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                {agent.name}
              </h3>
            </Link>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {agent.description}
            </p>
          </div>
        </div>

        {/* Creator Info */}
        <Link
          href={`/creators/${agent.creator_id}`}
          className="flex items-center gap-2 mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {agent.creator.avatar_url && (
            <Image
              src={agent.creator.avatar_url}
              alt={agent.creator.display_name}
              width={20}
              height={20}
              className="rounded-full"
            />
          )}
          <span className="truncate">by {agent.creator.display_name}</span>
          {agent.creator.verified && (
            <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </Link>
      </CardHeader>

      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-1.5 text-sm">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="font-medium">{agent.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({agent.total_reviews})</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span>{agent.total_runs.toLocaleString()} runs</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{agent.config.timeout_seconds}s</span>
          </div>
        </div>

        {/* Tags */}
        {!isCompact && agent.tags && agent.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {agent.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
            {agent.tags.length > 3 && (
              <span className="text-xs text-muted-foreground px-2 py-1">
                +{agent.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <div className="text-lg font-semibold">
          {agent.price_per_run} <span className="text-sm text-muted-foreground">credits</span>
        </div>
        <div className="flex gap-2">
          {agent.demo_available && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/agents/${agent.id}?demo=true`}>Try Demo</Link>
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => onExecute?.(agent)}
          >
            Run Agent
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
```

### Create `src/components/features/SearchBar/SearchBar.tsx`
```typescript
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { AgentFilters, AgentCategory } from '@/lib/types';
import { useAgentStore } from '@/lib/store';
import debounce from 'lodash/debounce';

export function SearchBar() {
  const { filters, updateFilters, clearFilters } = useAgentStore();
  const [searchQuery, setSearchQuery] = useState(filters.search_query || '');
  const [showFilters, setShowFilters] = useState(false);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      updateFilters({ search_query: query });
    }, 500),
    [updateFilters]
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handleClearAll = () => {
    setSearchQuery('');
    clearFilters();
    setShowFilters(false);
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="w-full space-y-4">
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <Button
          variant={showFilters ? 'default' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="bg-primary-foreground text-primary text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {Object.keys(filters).length}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={handleClearAll}>
            Clear All
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="glass-effect rounded-lg p-4 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.category || ''}
                onChange={(e) => updateFilters({ 
                  category: e.target.value as AgentCategory | undefined 
                })}
              >
                <option value="">All Categories</option>
                {Object.values(AgentCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum Rating</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.min_rating || ''}
                onChange={(e) => updateFilters({ 
                  min_rating: e.target.value ? Number(e.target.value) : undefined 
                })}
              >
                <option value="">Any Rating</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="4.0">4.0+ Stars</option>
                <option value="3.5">3.5+ Stars</option>
                <option value="3.0">3.0+ Stars</option>
              </select>
            </div>

            {/* Price Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Price (Credits)</label>
              <Input
                type="number"
                placeholder="Any price"
                value={filters.max_price || ''}
                onChange={(e) => updateFilters({ 
                  max_price: e.target.value ? Number(e.target.value) : undefined 
                })}
              />
            </div>
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sort By</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'popular', label: 'Most Popular' },
                { value: 'rating', label: 'Highest Rated' },
                { value: 'newest', label: 'Newest' },
                { value: 'price_low', label: 'Price: Low to High' },
                { value: 'price_high', label: 'Price: High to Low' },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={filters.sort_by === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateFilters({ sort_by: option.value as any })}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Create `src/components/features/UserProfile/UserProfile.tsx`
```typescript
'use client';

import { User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Coins, LogOut, Settings, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';

interface UserProfileProps {
  user: User;
  variant?: 'compact' | 'full';
}

export function UserProfile({ user, variant = 'compact' }: UserProfileProps) {
  const { signOut } = useAuth();

  if (variant === 'compact') {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar_url} alt={user.full_name} />
              <AvatarFallback>
                {user.full_name.split(' ').map((n) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.full_name}</p>
              <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between p-3 bg-secondary rounded-lg">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold">{user.credits.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">credits</span>
            </div>
            <Button size="sm" asChild>
              <Link href="/credits/purchase">Buy More</Link>
            </Button>
          </div>

          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link href="/settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.avatar_url} alt={user.full_name} />
            <AvatarFallback className="text-2xl">
              {user.full_name.split(' ').map((n) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle>{user.full_name}</CardTitle>
            <p className="text-muted-foreground">@{user.username}</p>
            <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {user.bio && (
          <div>
            <h4 className="font-medium mb-2">Bio</h4>
            <p className="text-sm text-muted-foreground">{user.bio}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-secondary rounded-lg">
            <div className="flex items-center gap-2 text-yellow-500 mb-1">
              <Coins className="w-5 h-5" />
              <span className="font-semibold text-foreground">Credits</span>
            </div>
            <p className="text-2xl font-bold">{user.credits.toLocaleString()}</p>
            <Button size="sm" className="mt-2 w-full" asChild>
              <Link href="/credits/purchase">Purchase More</Link>
            </Button>
          </div>

          <div className="p-4 bg-secondary rounded-lg">
            <div className="flex items-center gap-2 text-primary mb-1">
              <UserIcon className="w-5 h-5" />
              <span className="font-semibold text-foreground">Role</span>
            </div>
            <p className="text-2xl font-bold capitalize">{user.role}</p>
            {user.role === 'user' && (
              <Button size="sm" variant="outline" className="mt-2 w-full" asChild>
                <Link href="/creator/apply">Become Creator</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" asChild>
            <Link href="/settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </Button>
          <Button variant="destructive" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### VS Code Copilot Prompt:
```
Create feature components in src/components/features/:
1. AgentCard.tsx - Card component with variants (default, compact, featured), thumbnail, stats (rating, runs, timeout), tags, creator info, demo/run buttons
2. SearchBar.tsx - Search input with debounced query, advanced filters panel (category, rating, price, sort), clear all button
3. UserProfile.tsx - User profile with variants (compact, full), avatar, credits display, bio, settings/logout buttons

Include proper animations, hover states, responsive design, and TypeScript types. Use Lucide icons and Link from next/link.
```

---

## 📝 STEP 12: FORM VALIDATION (React Hook Form + Zod)

### Create `src/lib/schemas/auth.schema.ts`
```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
```

### Create `src/components/features/AuthForms/LoginForm.tsx`
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormData } from '@/lib/schemas/auth.schema';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/lib/hooks/useToast';
import { useState } from 'react';
import Link from 'next/link';

export function LoginForm() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await signIn(data.email, data.password);
      if (result.success) {
        toast.success('Welcome back!');
      } else {
        toast.error(result.error || 'Login failed');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register('password')}
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="rounded border-gray-300" />
          <span>Remember me</span>
        </label>
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" className="w-full" loading={isLoading}>
        Sign In
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link href="/signup" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
```

### Create `src/lib/schemas/agent.schema.ts`
```typescript
import { z } from 'zod';
import { AgentCategory } from '@/lib/types';

export const agentExecutionSchema = z.object({
  inputs: z.record(z.any()).refine(
    (data) => Object.keys(data).length > 0,
    'At least one input is required'
  ),
});

export const createAgentSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be at most 100 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be at most 500 characters'),
  long_description: z
    .string()
    .max(5000, 'Long description must be at most 5000 characters')
    .optional(),
  category: z.nativeEnum(AgentCategory, {
    errorMap: () => ({ message: 'Please select a valid category' }),
  }),
  tags: z
    .array(z.string())
    .min(1, 'At least one tag is required')
    .max(10, 'Maximum 10 tags allowed'),
  price_per_run: z
    .number()
    .min(1, 'Price must be at least 1 credit')
    .max(10000, 'Price cannot exceed 10,000 credits'),
  config: z.object({
    model: z.string().min(1, 'Model is required'),
    temperature: z.number().min(0).max(2),
    max_tokens: z.number().min(100).max(32000),
    timeout_seconds: z.number().min(10).max(300),
  }),
  demo_available: z.boolean().default(false),
});

export type AgentExecutionFormData = z.infer<typeof agentExecutionSchema>;
export type CreateAgentFormData = z.infer<typeof createAgentSchema>;
```

### VS Code Copilot Prompt:
```
Create form validation schemas and components:
1. src/lib/schemas/auth.schema.ts - Zod schemas for login (email, password) and signup (email, username, password with complexity rules, confirmPassword)
2. src/components/features/AuthForms/LoginForm.tsx - Login form using react-hook-form with zodResolver, error display, loading state, remember me checkbox, forgot password link
3. src/lib/schemas/agent.schema.ts - Zod schemas for agent execution and creation with proper validation rules

Export TypeScript types from schemas. Include proper error messages and validation rules (email format, password complexity, string lengths).
```

---

## 🔔 STEP 13: TOAST NOTIFICATIONS

### Create `src/components/ui/Toast/Toast.tsx`
```typescript
'use client';

import { useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { useUIStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onClose: () => void;
}

function Toast({ id, type, message, duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  const colors = {
    success: 'bg-success text-white',
    error: 'bg-destructive text-destructive-foreground',
    warning: 'bg-warning text-white',
    info: 'bg-primary text-primary-foreground',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: 100 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className={`pointer-events-auto flex items-center gap-3 p-4 rounded-lg shadow-lg ${colors[type]}`}
    >
      <div className="flex-shrink-0">{icons[type]}</div>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:opacity-80 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
```

### Update `src/app/layout.tsx` to include ToastContainer
```typescript
import { ToastContainer } from '@/components/ui/Toast';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
```

### VS Code Copilot Prompt:
```
Create toast notification system:
1. src/components/ui/Toast/Toast.tsx - ToastContainer and Toast components with types (success, error, warning, info), auto-dismiss, close button, icons from lucide-react, framer-motion animations
2. Update app/layout.tsx to include ToastContainer in root layout

Use Zustand UI store for toast state management. Include slide-in animation from right and fade-out on dismiss.
```

---

## 🪟 STEP 14: MODAL SYSTEM

### Create `src/components/ui/Modal/Modal.tsx`
```typescript
'use client';

import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  footer?: ReactNode;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  footer,
}: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOnOverlayClick ? onClose : undefined}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`bg-card rounded-lg shadow-2xl w-full ${sizeClasses[size]} pointer-events-auto max-h-[90vh] flex flex-col`}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-start justify-between p-6 border-b">
                  <div className="flex-1">
                    {title && (
                      <h2 className="text-2xl font-semibold">{title}</h2>
                    )}
                    {description && (
                      <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    )}
                  </div>
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="text-muted-foreground hover:text-foreground transition-colors ml-4"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="flex items-center justify-end gap-2 p-6 border-t">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// Confirmation Dialog Helper
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-muted-foreground">{description}</p>
    </Modal>
  );
}
```

### VS Code Copilot Prompt:
```
Create modal system at src/components/ui/Modal/Modal.tsx:
1. Modal component with sizes (sm, md, lg, xl, full), title, description, children, footer
2. Features: close button, overlay click to close, escape key handler, body scroll lock
3. ConfirmDialog helper component for confirmation prompts
4. Use framer-motion for animations, createPortal for rendering
5. Include proper accessibility (focus trap, keyboard navigation)
```

---

## ♿ STEP 15: ACCESSIBILITY IMPROVEMENTS

### Create `src/components/ui/VisuallyHidden/VisuallyHidden.tsx`
```typescript
import { ReactNode } from 'react';

interface VisuallyHiddenProps {
  children: ReactNode;
}

export function VisuallyHidden({ children }: VisuallyHiddenProps) {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
}
```

### Create `src/components/shared/SkipToContent/SkipToContent.tsx`
```typescript
'use client';

export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
    >
      Skip to main content
    </a>
  );
}
```

### Update `tailwind.config.js` for accessibility
```javascript
module.exports = {
  // ... existing config
  theme: {
    extend: {
      // Add focus ring utilities
      ringWidth: {
        DEFAULT: '2px',
      },
      ringOffsetWidth: {
        DEFAULT: '2px',
      },
    },
  },
  plugins: [
    // ... existing plugins
    function({ addUtilities }) {
      addUtilities({
        '.sr-only': {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: '0',
        },
        '.not-sr-only': {
          position: 'static',
          width: 'auto',
          height: 'auto',
          padding: '0',
          margin: '0',
          overflow: 'visible',
          clip: 'auto',
          whiteSpace: 'normal',
        },
      });
    },
  ],
};
```

### Accessibility Checklist for Components
```markdown
# Component Accessibility Checklist

For every interactive component, ensure:

## 1. Semantic HTML
- [ ] Use proper HTML elements (button, a, input, etc.)
- [ ] Use headings in logical order (h1 → h2 → h3)
- [ ] Use landmarks (nav, main, aside, footer)

## 2. ARIA Labels
- [ ] Add aria-label for icon-only buttons
- [ ] Add aria-labelledby for complex components
- [ ] Add aria-describedby for additional context
- [ ] Add aria-hidden for decorative elements

## 3. Keyboard Navigation
- [ ] All interactive elements are keyboard accessible
- [ ] Proper tab order with tabIndex
- [ ] Visible focus indicators
- [ ] Escape key closes modals/dropdowns
- [ ] Arrow keys for navigation in lists/menus

## 4. Screen Reader Support
- [ ] Meaningful alt text for images
- [ ] Screen reader announcements for dynamic content
- [ ] Use VisuallyHidden for context
- [ ] Proper form labels

## 5. Color & Contrast
- [ ] WCAG AA color contrast (4.5:1 for text)
- [ ] Don't rely solely on color for information
- [ ] Test in high contrast mode

## 6. Motion & Animation
- [ ] Respect prefers-reduced-motion
- [ ] Provide alternatives to auto-playing content
```

### VS Code Copilot Prompt:
```
Create accessibility utilities and update components:
1. src/components/ui/VisuallyHidden/VisuallyHidden.tsx - Component for screen-reader-only content
2. src/components/shared/SkipToContent/SkipToContent.tsx - Skip link for keyboard users
3. Update tailwind.config.js with sr-only and focus ring utilities
4. Create accessibility checklist markdown file

Then audit all existing components to add:
- aria-label on icon buttons
- proper role attributes
- keyboard event handlers (onKeyDown for Enter/Space)
- focus-visible styles
```

---

## ⚡ STEP 16: PERFORMANCE OPTIMIZATION

### Create `src/lib/utils/lazyImport.ts`
```typescript
import { lazy, ComponentType } from 'react';

export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retries = 3,
  interval = 1000
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    for (let i = 0; i < retries; i++) {
      try {
        return await componentImport();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }
    throw new Error('Failed to load component');
  });
}
```

### Update pages for code splitting
```typescript
// src/app/agents/[id]/page.tsx (Example)
import { Suspense, lazy } from 'react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { lazyWithRetry } from '@/lib/utils/lazyImport';

const AgentDetailContent = lazyWithRetry(() => import('@/components/features/AgentDetail'));

export default function AgentDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" />}>
      <AgentDetailContent agentId={params.id} />
    </Suspense>
  );
}
```

### Create `src/lib/hooks/useIntersectionObserver.ts`
```typescript
import { useEffect, useState, RefObject } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number;
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

export function useIntersectionObserver(
  elementRef: RefObject<Element>,
  options: UseIntersectionObserverOptions = {}
): IntersectionObserverEntry | undefined {
  const { threshold = 0, root = null, rootMargin = '0px', freezeOnceVisible = false } = options;

  const [entry, setEntry] = useState<IntersectionObserverEntry>();

  const frozen = entry?.isIntersecting && freezeOnceVisible;

  useEffect(() => {
    const node = elementRef?.current;
    const hasIOSupport = !!window.IntersectionObserver;

    if (!hasIOSupport || frozen || !node) return;

    const observerParams = { threshold, root, rootMargin };
    const observer = new IntersectionObserver(([entry]) => setEntry(entry), observerParams);

    observer.observe(node);

    return () => observer.disconnect();
  }, [elementRef, threshold, root, rootMargin, frozen]);

  return entry;
}
```

### Image Optimization Component
```typescript
// src/components/ui/OptimizedImage/OptimizedImage.tsx
'use client';

import Image, { ImageProps } from 'next/image';
import { useState, useRef } from 'react';
import { useIntersectionObserver } from '@/lib/hooks/useIntersectionObserver';
import { Skeleton } from '@/components/shared/LoadingSpinner';

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad'> {
  skeletonClassName?: string;
}

export function OptimizedImage({ skeletonClassName, alt, ...props }: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  const entry = useIntersectionObserver(imgRef, {
    threshold: 0.1,
    freezeOnceVisible: true,
  });

  if (entry?.isIntersecting && !isInView) {
    setIsInView(true);
  }

  return (
    <div ref={imgRef} className="relative">
      {!isLoaded && <Skeleton className={skeletonClassName || 'absolute inset-0'} />}
      {isInView && (
        <Image
          {...props}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
        />
      )}
    </div>
  );
}
```

### VS Code Copilot Prompt:
```
Create performance optimization utilities:
1. src/lib/utils/lazyImport.ts - Lazy loading with retry logic for components
2. src/lib/hooks/useIntersectionObserver.ts - Hook for lazy loading on scroll
3. src/components/ui/OptimizedImage/OptimizedImage.tsx - Image component with lazy loading and skeleton

Then update all page components to use:
- Dynamic imports with lazyWithRetry for heavy components
- Suspense boundaries with loading fallbacks
- OptimizedImage instead of regular Image
```

---

## 🔒 STEP 17: SECURITY HARDENING

### Create `src/lib/utils/sanitize.ts`
```typescript
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 10000); // Limit length
}

export function sanitizeURL(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
```

### Create `src/lib/utils/rateLimit.ts`
```typescript
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get existing requests for this key
    const keyRequests = this.requests.get(key) || [];
    
    // Filter out old requests outside the window
    const recentRequests = keyRequests.filter((time) => time > windowStart);

    // Check if under limit
    if (recentRequests.length >= config.maxRequests) {
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(key, recentRequests);

    return true;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

// Usage example:
// const canProceed = rateLimiter.isAllowed('user-123', { maxRequests: 10, windowMs: 60000 });
```

### Create `src/lib/utils/encryption.ts`
```typescript
export async function hashPassword(password: string): Promise<string> {
  // Note: In production, use bcrypt or similar on the backend
  // This is just for client-side one-way hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}
```

### Update API client with CSRF protection
```typescript
// Add to src/lib/api/client.ts

// CSRF Token management
let csrfToken: string | null = null;

export function setCSRFToken(token: string) {
  csrfToken = token;
}

// Update request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add CSRF token for state-changing requests
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);
```

### Security Checklist
```markdown
# Frontend Security Checklist

## 1. Input Validation & Sanitization
- [ ] Sanitize all user inputs before display (use sanitizeHTML)
- [ ] Validate URLs before redirecting (use sanitizeURL)
- [ ] Limit input lengths to prevent DoS
- [ ] Use Zod schemas for all form validation

## 2. XSS Protection
- [ ] Use dangerouslySetInnerHTML only with sanitized content
- [ ] Escape all user-generated content
- [ ] Set proper Content-Security-Policy headers
- [ ] Use httpOnly cookies for auth tokens

## 3. CSRF Protection
- [ ] Include CSRF tokens in state-changing requests
- [ ] Verify token on backend
- [ ] Use SameSite cookie attribute

## 4. Authentication & Authorization
- [ ] Store tokens in httpOnly cookies (not localStorage)
- [ ] Implement token refresh mechanism
- [ ] Add rate limiting to login attempts
- [ ] Require re-authentication for sensitive actions

## 5. Data Protection
- [ ] Use HTTPS for all requests
- [ ] Don't expose sensitive data in URLs
- [ ] Clear sensitive data from memory after use
- [ ] Implement proper error messages (don't leak system info)

## 6. Dependencies
- [ ] Regularly update npm packages
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Use `npm ci` in production
- [ ] Review dependencies for malicious code
```

### VS Code Copilot Prompt:
```
Create security utilities and update API client:
1. src/lib/utils/sanitize.ts - Functions for sanitizing HTML, inputs, and URLs using DOMPurify
2. src/lib/utils/rateLimit.ts - Client-side rate limiter for preventing abuse
3. src/lib/utils/encryption.ts - Password hashing and nonce generation
4. Update src/lib/api/client.ts to include CSRF token in request headers

Then audit all components to:
- Use sanitizeHTML before rendering user content
- Add rate limiting to form submissions
- Validate all external URLs before navigation
```

---

## 🧪 STEP 18: TESTING SETUP

### Install testing dependencies
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react
```

### Create `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Create `src/test/setup.ts`
```typescript
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: (props: any) => {
    return <img {...props} />;
  },
}));
```

### Create test utilities `src/test/utils.tsx`
```typescript
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

export * from '@testing-library/react';
export { renderWithProviders as render };
```

### Example Component Test
```typescript
// src/components/ui/Button/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByText('Click me').closest('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveClass('opacity-50');
  });

  it('applies variant styles', () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByText('Delete')).toHaveClass('bg-destructive');
    
    rerender(<Button variant="outline">Cancel</Button>);
    expect(screen.getByText('Cancel')).toHaveClass('border');
  });
});
```

### Update `package.json` scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch"
  }
}
```

### VS Code Copilot Prompt:
```
Setup testing infrastructure:
1. Install vitest, @testing-library/react, jsdom, and related packages
2. Create vitest.config.ts with React plugin and jsdom environment
3. Create src/test/setup.ts with cleanup and Next.js mocks
4. Create src/test/utils.tsx with renderWithProviders helper
5. Write example test for Button component in Button.test.tsx

Then create tests for:
- All UI components (Button, Input, Card, Modal)
- Form components with validation
- Custom hooks (useAuth, useAgents, useToast)
- API client functions with mocked axios
```

---

## 📚 STEP 19: STORYBOOK SETUP

### Initialize Storybook
```bash
npx storybook@latest init
```

### Create `.storybook/preview.tsx`
```typescript
import type { Preview } from '@storybook/react';
import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: '#0a0a0a',
        },
        {
          name: 'light',
          value: '#ffffff',
        },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div className="p-8">
        <Story />
      </div>
    ),
  ],
};

export default preview;
```

### Example Story: Button
```typescript
// src/components/ui/Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    loading: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Cancel',
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    children: 'Loading...',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};
```

### Example Story: AgentCard
```typescript
// src/components/features/AgentCard/AgentCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { AgentCard } from './AgentCard';
import { Agent, AgentCategory, AgentStatus } from '@/lib/types';

const mockAgent: Agent = {
  id: '1',
  name: 'SEO Optimizer',
  description: 'Analyze and optimize your website for search engines',
  category: AgentCategory.MARKETING,
  tags: ['SEO', 'Content', 'Analytics'],
  creator_id: 'creator-1',
  creator: {
    id: 'creator-1',
    user_id: 'user-1',
    display_name: 'John Doe',
    verified: true,
    total_agents: 5,
    total_earnings: 10000,
    avg_rating: 4.8,
    created_at: '2024-01-01',
  },
  version: '1.0.0',
  price_per_run: 50,
  rating: 4.8,
  total_runs: 1250,
  total_reviews: 89,
  status: AgentStatus.ACTIVE,
  config: {
    model: 'gpt-4',
    temperature: 0.7,
    max_tokens: 2000,
    timeout_seconds: 120,
    required_inputs: [],
    output_schema: {},
  },
  capabilities: ['Website Analysis', 'Keyword Research', 'Content Optimization'],
  thumbnail_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400',
  demo_available: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-15',
};

const meta: Meta<typeof AgentCard> = {
  title: 'Features/AgentCard',
  component: AgentCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof AgentCard>;

export const Default: Story = {
  args: {
    agent: mockAgent,
  },
};

export const Featured: Story = {
  args: {
    agent: mockAgent,
    variant: 'featured',
  },
};

export const Compact: Story = {
  args: {
    agent: mockAgent,
    variant: 'compact',
  },
};

export const NoThumbnail: Story = {
  args: {
    agent: {
      ...mockAgent,
      thumbnail_url: undefined,
    },
  },
};
```

### VS Code Copilot Prompt:
```
Setup Storybook for component development:
1. Run `npx storybook@latest init`
2. Create .storybook/preview.tsx with dark theme and global styles
3. Create stories for all UI components:
   - Button.stories.tsx with all variants and sizes
   - Input.stories.tsx with error states and validation
   - Card.stories.tsx with different layouts
   - Modal.stories.tsx with sizes and examples
4. Create stories for feature components:
   - AgentCard.stories.tsx with variants
   - SearchBar.stories.tsx with filters
   - UserProfile.stories.tsx

Include mock data generators and interactive controls.
```

---

## 📖 STEP 20: DOCUMENTATION

### Create `README.md` in components directory
```markdown
# Component Documentation

## File Structure

```
components/
├── ui/                  # Reusable UI primitives
│   ├── Button/
│   ├── Input/
│   ├── Card/
│   ├── Modal/
│   └── Toast/
├── features/            # Feature-specific components
│   ├── AgentCard/
│   ├── SearchBar/
│   └── UserProfile/
├── layouts/             # Layout components
│   ├── Header/
│   ├── Sidebar/
│   └── Footer/
└── shared/              # Shared utilities
    ├── ErrorBoundary/
    └── LoadingSpinner/
```

## Component Guidelines

### 1. File Organization
Each component should have its own folder with:
- `ComponentName.tsx` - Main component
- `ComponentName.test.tsx` - Unit tests
- `ComponentName.stories.tsx` - Storybook stories
- `index.ts` - Clean exports

### 2. TypeScript
- Use strict types (no `any`)
- Export interfaces for props
- Use enums for constants

### 3. Styling
- Use Tailwind classes
- Use `cn()` utility for conditional classes
- Follow design system tokens

### 4. Accessibility
- Add ARIA labels for icon buttons
- Ensure keyboard navigation
- Include focus indicators
- Test with screen readers

### 5. Performance
- Lazy load heavy components
- Memoize expensive computations
- Use proper React keys

## Example Component Template

```typescript
'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ComponentNameProps {
  // Props here
}

export const ComponentName = forwardRef<HTMLDivElement, ComponentNameProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('base-classes', className)}
        {...props}
      />
    );
  }
);

ComponentName.displayName = 'ComponentName';
```
```

### Create `CONTRIBUTING.md`
```markdown
# Contributing to AgentGrid Frontend

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Run dev server: `npm run dev`
4. Run tests: `npm test`
5. Run Storybook: `npm run storybook`

## Development Workflow

### 1. Before You Code
- Check existing components before creating new ones
- Read the component documentation
- Review the design system in Storybook

### 2. Creating Components
- Use the component template from README
- Add TypeScript types
- Include tests
- Add Storybook story
- Update documentation

### 3. Code Standards
- Use Prettier for formatting (run `npm run format`)
- Follow ESLint rules (run `npm run lint`)
- Write meaningful commit messages
- Keep components small and focused

### 4. Testing
- Write unit tests for all components
- Test accessibility with keyboard navigation
- Test loading and error states
- Aim for 80%+ coverage

### 5. Pull Requests
- Create feature branch: `git checkout -b feature/your-feature`
- Make your changes
- Run all tests and linters
- Create PR with clear description
- Request review

## Code Review Checklist

- [ ] TypeScript types are correct
- [ ] Component is accessible (ARIA, keyboard nav)
- [ ] Tests are passing
- [ ] Storybook story exists
- [ ] No console errors or warnings
- [ ] Responsive design works
- [ ] Dark mode works
- [ ] Performance is good (no unnecessary re-renders)
```

### VS Code Copilot Prompt:
```
Create comprehensive documentation:
1. README.md in src/components/ with file structure, guidelines, example template
2. CONTRIBUTING.md with development workflow, code standards, testing requirements
3. Add JSDoc comments to all exported functions and components
4. Create ARCHITECTURE.md explaining folder structure, state management, API patterns

Include:
- Setup instructions
- Coding standards
- Component creation checklist
- PR process
- Common patterns and anti-patterns
```

---

## ✅ FINAL IMPLEMENTATION SUMMARY

You have now completed all 20 steps for transforming AgentGrid V0 frontend to 10/10 quality:

### ✅ Foundation (Steps 1-5)
1. Project structure setup
2. Dependencies installation
3. TypeScript strict mode
4. Tailwind design system
5. Core type definitions

### ✅ Architecture (Steps 6-10)
6. State management (Zustand)
7. Custom hooks
8. API client
9. Reusable UI components
10. Error boundary & loading

### ✅ Features (Steps 11-15)
11. Feature components
12. Form validation
13. Toast notifications
14. Modal system
15. Accessibility

### ✅ Quality (Steps 16-20)
16. Performance optimization
17. Security hardening
18. Testing setup
19. Storybook
20. Documentation

---

## 🚀 NEXT STEPS

1. **Implement these changes incrementally** - Don't try to do everything at once
2. **Start with Foundation** - Steps 1-5 are prerequisites
3. **Test as you go** - Write tests for each component you refactor
4. **Use AI assistants** - Give the VS Code Copilot prompts to speed up implementation
5. **Review and iterate** - After implementing, review for improvements

## 📋 PRIORITY ORDER

If you need to prioritize, implement in this order:
1. **P0 (Critical)**: Steps 1-8 - Foundation and core architecture
2. **P1 (Important)**: Steps 9-13 - UI components and forms
3. **P2 (Nice-to-have)**: Steps 14-20 - Advanced features and documentation

---

**This completes the comprehensive frontend refactoring guide. Your frontend will now be production-ready with 10/10 quality!**

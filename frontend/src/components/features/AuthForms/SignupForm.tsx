// src/components/features/AuthForms/SignupForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupFormData } from '@/lib/schemas/auth.schema';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/lib/hooks/useToast';
import { rateLimiter } from '@/lib/utils';

export function SignupForm() {
    const { signUp } = useAuth();
    const { success, error } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
    });

    const onSubmit = async (data: SignupFormData) => {
        setIsLoading(true);
        const allowed = rateLimiter.isAllowed('signup-form', {
            maxRequests: 5,
            windowMs: 60_000,
        });
        if (!allowed) {
            error('Too many signup attempts. Please wait a moment and try again.');
            setIsLoading(false);
            return;
        }
        try {
            const result = await signUp(data);
            if (result.success) {
                success('Account created! You are now logged in.');
            } else {
                error(result.error || 'Signup failed');
            }
        } catch {
            error('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
                label="Username"
                type="text"
                placeholder="johndoe"
                error={errors.username?.message}
                {...register('username')}
            />
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
                placeholder="********"
                error={errors.password?.message}
                {...register('password')}
            />
            <Input
                label="Confirm Password"
                type="password"
                placeholder="********"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
            />
            <Button type="submit" className="w-full" loading={isLoading}>
                Sign Up
            </Button>
        </form>
    );
}

// @ts-nocheck

import React, { useState } from 'react';
import { CreditIcon, StarIcon } from '../icons/Icons';
import { creditPackages } from '../../constants';
import { CreditPackage } from '../../types';
import { api } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { useAuthStore } from '@/lib/store';

const CreditPackageCard: React.FC<{ pkg: CreditPackage }> = ({ pkg }) => {
    const { success, error } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuthStore(); // Used to update user state

    const handlePurchase = async () => {
        setIsLoading(true);
        try {
            // Calculate total credits (base + bonus)
            // Example: 1000 credits + 20% bonus = 1200
            const totalCredits = Math.floor(pkg.credits * (1 + pkg.bonus / 100));

            await api.credits.purchase(totalCredits);
            success(`Successfully purchased ${totalCredits.toLocaleString()} credits!`);

            // Refresh User Data
            const userResponse = await api.auth.getCurrentUser();
            // We assume the response structure matches what login expects or we manually patch
            // The backend /auth/me returns User object. 
            // We need to match what useAuth expects (frontendUser).
            const payload = userResponse.data as any; // Adjust if wrapped
            const user = payload.data || payload;

            // Construct frontend user object consistent with useAuth
            const frontendUser: any = {
                ...user,
                name: user.full_name || user.username || 'User',
                creditBalance: user.credits || 0,
                favoriteAgentIds: user.favoriteAgentIds || [],
            };

            login(frontendUser); // Updates the store
            setTimeout(() => {
                window.location.assign("/dashboard/settings");
            }, 400);

        } catch (e: any) {
            error(e.response?.data?.detail || "Purchase failed. Please try again.");
            console.error("Purchase error", e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`relative rounded-lg border ${pkg.isBestValue ? 'border-primary ring-1 ring-primary' : 'border-border'} bg-card p-6 text-center shadow-sm`}>
            {pkg.isBestValue && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Best Value
                </div>
            )}
            <h3 className="text-lg font-semibold text-foreground">{pkg.credits.toLocaleString()} Credits</h3>
            {pkg.bonus > 0 && <p className="text-sm text-primary">includes {pkg.bonus}% bonus!</p>}
            <div className="my-4">
                <span className="text-4xl font-extrabold text-foreground">${pkg.price}</span>
            </div>
            <p className="text-xs text-muted-foreground">
                ${(pkg.price / (pkg.credits * (1 + pkg.bonus / 100))).toFixed(4)} per credit
            </p>
            <button
                onClick={handlePurchase}
                disabled={isLoading}
                className="mt-6 inline-flex w-full h-11 items-center justify-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? 'Processing...' : 'Purchase Now'}
            </button>
        </div>
    );
}

const PricingPage: React.FC = () => {
    return (
        <div className="container mx-auto max-w-screen-xl px-4 py-16">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Buy Credits</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Purchase credits to run agents, access premium features, and power your workflows.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {creditPackages.map(pkg => (
                    <CreditPackageCard key={pkg.id} pkg={pkg} />
                ))}
            </div>

            <div className="mt-16 text-center text-muted-foreground">
                <p>All payments are processed securely. Credits are added to your account instantly.</p>
                <p>Have questions? <a href="#" className="font-medium text-primary hover:underline">Contact support</a>.</p>
            </div>
        </div>
    );
};

export default PricingPage;

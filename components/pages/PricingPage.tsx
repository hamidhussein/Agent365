
import React from 'react';
import { CreditIcon, StarIcon } from '../icons/Icons';
import { creditPackages } from '../../constants';
import { CreditPackage } from '../../types';

const CreditPackageCard: React.FC<{ pkg: CreditPackage }> = ({ pkg }) => {
    return (
        <div className={`relative rounded-lg border ${pkg.isBestValue ? 'border-brand-primary' : 'border-gray-700'} bg-gray-800/50 p-6 text-center`}>
            {pkg.isBestValue && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-primary px-3 py-1 text-xs font-semibold text-white">
                    Best Value
                </div>
            )}
            <h3 className="text-lg font-semibold text-white">{pkg.credits.toLocaleString()} Credits</h3>
            {pkg.bonus > 0 && <p className="text-sm text-brand-secondary">includes {pkg.bonus}% bonus!</p>}
            <div className="my-4">
                <span className="text-4xl font-extrabold text-white">${pkg.price}</span>
            </div>
            <p className="text-xs text-gray-400">
                ${(pkg.price / (pkg.credits * (1 + pkg.bonus/100))).toFixed(4)} per credit
            </p>
            <button className="mt-6 inline-flex w-full h-11 items-center justify-center rounded-md bg-brand-primary px-6 text-base font-medium text-white shadow transition-colors hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-gray-900">
                Purchase Now
            </button>
        </div>
    );
}

const PricingPage: React.FC = () => {
    return (
        <div className="container mx-auto max-w-screen-xl px-4 py-16">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Buy Credits</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-400">
                    Purchase credits to run agents, access premium features, and power your workflows.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {creditPackages.map(pkg => (
                    <CreditPackageCard key={pkg.id} pkg={pkg} />
                ))}
            </div>

            <div className="mt-16 text-center text-gray-400">
                 <p>All payments are processed securely. Credits are added to your account instantly.</p>
                 <p>Have questions? <a href="#" className="font-medium text-brand-primary hover:underline">Contact support</a>.</p>
            </div>
        </div>
    );
};

export default PricingPage;

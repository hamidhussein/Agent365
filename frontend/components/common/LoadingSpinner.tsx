
import React from 'react';
import { BotIcon } from '../icons/Icons';

const LoadingSpinner: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
            <div className="flex flex-col items-center">
                <BotIcon className="h-12 w-12 animate-pulse text-brand-primary" />
                <p className="mt-4 text-sm text-gray-300">Loading...</p>
            </div>
        </div>
    );
};

export default LoadingSpinner;

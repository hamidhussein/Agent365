
import React from 'react';
import { AlertTriangleIcon } from '../icons/Icons';

interface ErrorDisplayProps {
    title: string;
    message: string;
    actionText?: string;
    onAction?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ title, message, actionText, onAction }) => {
    return (
        <div className="flex flex-col items-center justify-center text-center">
            <AlertTriangleIcon className="h-12 w-12 text-yellow-500" />
            <h2 className="mt-4 text-2xl font-bold text-white">{title}</h2>
            <p className="mt-2 text-gray-400">{message}</p>
            {actionText && onAction && (
                <button
                    onClick={onAction}
                    className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-brand-primary px-5 text-sm font-medium text-white shadow transition-colors hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                    {actionText}
                </button>
            )}
        </div>
    );
};

export default ErrorDisplay;

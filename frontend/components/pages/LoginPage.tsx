
import React from 'react';
import { Page } from '../../App';
import { LoginForm } from '@/components/features/AuthForms/LoginForm';
import { BotIcon } from '../icons/Icons';

interface LoginPageProps {
    setCurrentPage: (page: Page) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ setCurrentPage }) => {
    return (
        <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <BotIcon className="mx-auto h-12 w-auto text-brand-primary" />
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
                    Sign in to your account
                </h2>
                <p className="mt-2 text-center text-sm text-gray-400">
                    Or{' '}
                    <button onClick={() => setCurrentPage('signup')} className="font-medium text-brand-primary hover:text-brand-secondary">
                        create a new account
                    </button>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-8 shadow sm:px-10">
                    <LoginForm />
                </div>
            </div>
        </div>
    );
};

export default LoginPage;

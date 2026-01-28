
import React from 'react';
import { Page } from '../../App';
import { SignupForm } from '@/components/features/AuthForms/SignupForm';
import { BotIcon } from '../icons/Icons';

interface SignupPageProps {
    setCurrentPage: (page: Page) => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ setCurrentPage }) => {
    return (
        <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <BotIcon className="mx-auto h-12 w-auto text-primary" />
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-foreground">
                    Create your account
                </h2>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                    Already a member?{' '}
                    <button onClick={() => setCurrentPage('login')} className="font-medium text-primary hover:text-primary/80">
                        Sign in
                    </button>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="rounded-lg border border-border bg-card px-4 py-8 shadow sm:px-10">
                    <SignupForm onSuccess={() => setCurrentPage('marketplace')} />
                </div>
            </div>
        </div>
    );
};

export default SignupPage;

import React from 'react';
import { SignupForm } from '@/components/features/AuthForms/SignupForm';
import { Page, DashboardPage } from '@/App';

interface SignupPageProps {
    setCurrentPage: (page: Page, dashboardPage?: DashboardPage) => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ setCurrentPage }) => {
    return (
        <div className="max-w-md mx-auto mt-10 p-4 border rounded shadow-lg bg-gray-800 text-white">
            <h1 className="text-2xl font-bold mb-4 text-center">Create an Account</h1>
            <SignupForm />
            <p className="mt-4 text-center text-sm text-gray-400">
                Already have an account?{' '}
                <button
                    onClick={() => setCurrentPage('login')}
                    className="text-blue-400 hover:underline"
                >
                    Log in
                </button>
            </p>
        </div>
    );
};

export default SignupPage;

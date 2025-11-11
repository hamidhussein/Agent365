
import React from 'react';
import { BotIcon, TwitterIcon, GithubIcon } from './icons/Icons';

const Footer: React.FC = () => {
    return (
        <footer className="border-t border-gray-800 bg-gray-900">
            <div className="container mx-auto max-w-screen-2xl px-4 py-8">
                <div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
                    <div className="flex items-center space-x-2">
                        <BotIcon className="h-6 w-6 text-gray-400" />
                        <span className="text-lg font-semibold">AgentGrid</span>
                    </div>
                    <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} AgentGrid Inc. All rights reserved.</p>
                    <div className="flex space-x-4">
                        <a href="#" className="text-gray-400 hover:text-white">
                            <span className="sr-only">Twitter</span>
                            <TwitterIcon className="h-5 w-5" />
                        </a>
                        <a href="#" className="text-gray-400 hover:text-white">
                            <span className="sr-only">GitHub</span>
                            <GithubIcon className="h-5 w-5" />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

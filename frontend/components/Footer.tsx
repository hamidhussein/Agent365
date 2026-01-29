
import React from 'react';
import { BotIcon, TwitterIcon, GithubIcon } from './icons/Icons';

const Footer: React.FC = () => {
    return (
        <footer className="border-t border-border bg-muted/30">
            <div className="container mx-auto max-w-screen-2xl px-4 py-6">
                <div className="flex flex-col items-center justify-between space-y-3 sm:flex-row sm:space-y-0 text-center sm:text-left">
                    <div className="flex items-center space-x-3">
                        <BotIcon className="h-5 w-5 text-primary" />
                        <span className="text-base font-display font-semibold text-foreground tracking-tight">AgentGrid</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">&copy; {new Date().getFullYear()} AgentGrid Inc. All rights reserved.</p>
                    <div className="flex space-x-4">
                        <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-200">
                            <span className="sr-only">Twitter</span>
                            <TwitterIcon className="h-4 w-4" />
                        </a>
                        <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-200">
                            <span className="sr-only">GitHub</span>
                            <GithubIcon className="h-4 w-4" />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

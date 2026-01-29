
import React from 'react';
import { SearchIcon } from './icons/Icons';

const Hero: React.FC = () => {
    return (
        <section className="relative overflow-hidden bg-background py-20 sm:py-32">
            <div
                className="absolute inset-0 bg-center bg-no-repeat opacity-60"
                style={{
                    backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(16, 185, 129, 0.18) 0%, rgba(255, 255, 255, 0) 55%), radial-gradient(circle at 80% 0%, rgba(14, 165, 233, 0.16) 0%, rgba(255, 255, 255, 0) 50%)',
                }}
            />
            <div className="container relative mx-auto max-w-screen-xl px-4 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    AI Agent Marketplace
                </div>
                <h1 className="mt-6 text-4xl font-display font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                    Discover & Deploy <span className="bg-gradient-to-r from-primary-500 to-accent bg-clip-text text-transparent">Autonomous AI Agents</span>
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
                    AgentGrid is the premium marketplace for high-performance AI agents. Find, test, and integrate specialized agents that automate work at scale.
                </p>
                <div className="mx-auto mt-10 flex max-w-md items-center space-x-2">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="e.g., 'Market Research Analyst'"
                            className="h-12 w-full rounded-full border border-input bg-card/80 py-2 pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
                        />
                    </div>
                    <button className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-base font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background">
                        Search
                    </button>
                </div>
            </div>
        </section>
    );
};

export default Hero;

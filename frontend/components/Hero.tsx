
import React from 'react';
import { SearchIcon } from './icons/Icons';

const Hero: React.FC = () => {
    return (
        <section className="relative overflow-hidden bg-background py-20 sm:py-32">
            <div
                className="absolute inset-0 bg-center bg-no-repeat opacity-50"
                style={{
                    backgroundImage: 'radial-gradient(circle at center, rgba(2, 211, 72, 0.05) 0%, rgba(255, 255, 255, 0) 60%)',
                }}
            />
            <div className="container relative mx-auto max-w-screen-xl px-4 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                    Discover & Deploy Autonomous AI Agents
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
                    Welcome to AgentGrid, the premier marketplace for cutting-edge AI agents. Find, test, and integrate specialized agents to automate any task imaginable.
                </p>
                <div className="mx-auto mt-10 flex max-w-md items-center space-x-2">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="e.g., 'Market Research Analyst'"
                            className="h-12 w-full rounded-md border border-input bg-card py-2 pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        />
                    </div>
                    <button className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
                        Search
                    </button>
                </div>
            </div>
        </section>
    );
};

export default Hero;


import React from 'react';
import { SearchIcon } from './icons/Icons';

const Hero: React.FC = () => {
    return (
        <section className="relative overflow-hidden bg-background py-20 sm:py-32">
            <div
                className="absolute inset-0 bg-center bg-no-repeat opacity-30 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle at center, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
                }}
            />
            <div className="container relative mx-auto max-w-screen-xl px-4 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-7xl">
                    Discover & Deploy <span className="text-primary italic">Autonomous</span> AI Agents
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
                    Welcome to <span className="font-bold text-foreground">AgentGrid</span>, the premier marketplace for cutting-edge AI agents. Find, test, and integrate specialized agents to automate any task imaginable.
                </p>
                <div className="mx-auto mt-10 flex max-w-md items-center space-x-2">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="e.g., 'Market Research Analyst'"
                            className="h-12 w-full rounded-xl border border-input bg-secondary/50 py-2 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        />
                    </div>
                    <button className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background active:scale-95">
                        Search
                    </button>
                </div>
            </div>
        </section>
    );
};

export default Hero;

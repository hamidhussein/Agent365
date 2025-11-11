
import React from 'react';
import { SearchIcon } from './icons/Icons';

const Hero: React.FC = () => {
    return (
        <section className="relative overflow-hidden bg-gray-900 py-20 sm:py-32">
            <div
                className="absolute inset-0 bg-center bg-no-repeat"
                style={{
                    backgroundImage: 'radial-gradient(circle at center, rgba(79, 70, 229, 0.1) 0%, rgba(17, 24, 39, 0) 60%)',
                }}
            />
            <div className="container relative mx-auto max-w-screen-xl px-4 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
                    Discover & Deploy Autonomous AI Agents
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300">
                    Welcome to AgentGrid, the premier marketplace for cutting-edge AI agents. Find, test, and integrate specialized agents to automate any task imaginable.
                </p>
                <div className="mx-auto mt-10 flex max-w-md items-center space-x-2">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="e.g., 'Market Research Analyst'"
                            className="h-12 w-full rounded-md border border-gray-700 bg-gray-800/50 py-2 pl-12 pr-4 text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                    </div>
                    <button className="inline-flex h-12 items-center justify-center rounded-md bg-brand-primary px-6 text-base font-medium text-white shadow transition-colors hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-gray-900">
                        Search
                    </button>
                </div>
            </div>
        </section>
    );
};

export default Hero;

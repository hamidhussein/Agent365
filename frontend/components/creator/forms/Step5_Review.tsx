
import React from 'react';
import { NewAgentData } from '../../../types';
import { mockLLMModels, mockTools } from '../../../constants';
import { PencilIcon, CreditIcon } from '../../icons/Icons';

interface Step5ReviewProps {
    data: NewAgentData;
    goToStep: (step: number) => void;
}

const ReviewSection: React.FC<{title: string; onEdit: () => void; children: React.ReactNode}> = ({ title, onEdit, children }) => (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between border-b border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button onClick={onEdit} className="flex items-center gap-1.5 text-sm text-brand-primary hover:text-brand-primary/80">
                <PencilIcon className="h-4 w-4" />
                Edit
            </button>
        </div>
        <div className="p-4 space-y-4">
            {children}
        </div>
    </div>
);

const Detail: React.FC<{label: string; children: React.ReactNode}> = ({ label, children }) => (
    <div>
        <dt className="text-sm font-medium text-gray-400">{label}</dt>
        <dd className="mt-1 text-sm text-white">{children}</dd>
    </div>
);

const Step5_Review: React.FC<Step5ReviewProps> = ({ data, goToStep }) => {
    const selectedModel = mockLLMModels.find(m => m.id === data.llmConfig.model);
    const enabledTools = mockTools.filter(t => data.llmConfig.tools.includes(t.id));

    return (
        <div className="space-y-8">
            <p className="text-center text-gray-300">Please review all the information below before publishing your agent.</p>
            
            {/* Basics Review */}
            <ReviewSection title="Basics" onEdit={() => goToStep(1)}>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <Detail label="Agent Name">{data.name}</Detail>
                    <Detail label="Category">{data.category}</Detail>
                    <div className="sm:col-span-2">
                        <Detail label="Description">{data.description}</Detail>
                    </div>
                    <div className="sm:col-span-2">
                        <Detail label="Tags">
                            <div className="flex flex-wrap gap-2">
                                {data.tags.map(tag => (
                                     <span key={tag} className="rounded-full bg-brand-secondary/20 px-2.5 py-1 text-xs font-medium text-brand-secondary">{tag}</span>
                                ))}
                            </div>
                        </Detail>
                    </div>
                </dl>
            </ReviewSection>

            {/* Inputs Review */}
            <ReviewSection title="Input Schema" onEdit={() => goToStep(2)}>
                 <div className="space-y-4 rounded-md border border-dashed border-gray-600 bg-gray-800/30 p-4">
                    <h4 className="font-semibold text-white">User Form Preview</h4>
                     {data.inputSchema.length > 0 ? data.inputSchema.map(field => (
                        <div key={field.id}>
                            <label className="block text-sm font-medium text-gray-300">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            <span className="text-xs text-gray-400">Type: {field.type}, Name: <code className="text-xs">{field.name}</code></span>
                        </div>
                    )) : <p className="text-sm text-gray-400">No input fields defined.</p>}
                 </div>
            </ReviewSection>

            {/* Configuration Review */}
            <ReviewSection title="LLM Configuration" onEdit={() => goToStep(3)}>
                 <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-1">
                    <Detail label="Language Model">{selectedModel?.name || 'N/A'}</Detail>
                    <div>
                        <Detail label="System Prompt">
                            <pre className="mt-1 whitespace-pre-wrap rounded-md bg-gray-900 p-3 font-mono text-xs text-gray-300">{data.llmConfig.systemPrompt}</pre>
                        </Detail>
                    </div>
                    <Detail label="Enabled Tools">
                        {enabledTools.length > 0 ? enabledTools.map(t => t.name).join(', ') : 'None'}
                    </Detail>
                </dl>
            </ReviewSection>

             {/* Pricing Review */}
            <ReviewSection title="Pricing" onEdit={() => goToStep(4)}>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <Detail label="Price per Run">
                        <div className="flex items-center gap-1">
                            <CreditIcon className="h-4 w-4 text-green-400" />
                            <span>{data.pricingConfig.pricePerRun} credits</span>
                        </div>
                    </Detail>
                    <Detail label="Free Demo">
                        {data.pricingConfig.demoEnabled ? `Enabled (${data.pricingConfig.freeRuns} free runs)` : 'Disabled'}
                    </Detail>
                </dl>
            </ReviewSection>
        </div>
    );
};

export default Step5_Review;


import React from 'react';
import { NewAgentData, Tool } from '../../../types';
import { mockLLMModels, mockTools } from '../../../constants';
import { InfoIcon } from '../../icons/Icons';

interface Step3ConfigurationProps {
    data: NewAgentData;
    updateData: (data: Partial<NewAgentData>) => void;
}

const Step3_Configuration: React.FC<Step3ConfigurationProps> = ({ data, updateData }) => {
    
    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateData({ llmConfig: { ...data.llmConfig, model: e.target.value } });
    };

    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateData({ llmConfig: { ...data.llmConfig, systemPrompt: e.target.value } });
    };

    const handleToolToggle = (tool: Tool) => {
        const currentTools = data.llmConfig.tools;
        const newTools = currentTools.includes(tool)
            ? currentTools.filter(t => t !== tool)
            : [...currentTools, tool];
        updateData({ llmConfig: { ...data.llmConfig, tools: newTools } });
    };

    const modelsByProvider = mockLLMModels.reduce((acc, model) => {
        (acc[model.provider] = acc[model.provider] || []).push(model);
        return acc;
    }, {} as Record<string, typeof mockLLMModels>);

    return (
        <div className="space-y-6 rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-300">Language Model</label>
                <select
                    id="model"
                    name="model"
                    value={data.llmConfig.model}
                    onChange={handleModelChange}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                >
                    {Object.entries(modelsByProvider).map(([provider, models]) => (
                        <optgroup key={provider} label={provider.charAt(0).toUpperCase() + provider.slice(1)}>
                            {models.map(model => (
                                <option key={model.id} value={model.id}>{model.name}</option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-300">System Prompt</label>
                <textarea
                    name="systemPrompt"
                    id="systemPrompt"
                    rows={8}
                    value={data.llmConfig.systemPrompt}
                    onChange={handlePromptChange}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm font-mono"
                    placeholder="Define the agent's personality, role, and instructions."
                />
                <p className="mt-2 text-xs text-gray-500 flex items-start gap-1.5">
                    <InfoIcon className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    This is the core instruction for your agent. Be clear and specific about its purpose and constraints.
                </p>
            </div>

            <div>
                 <label className="block text-sm font-medium text-gray-300">Tools</label>
                 <div className="mt-2 space-y-3 rounded-md border border-gray-600 p-4">
                    {mockTools.map(tool => (
                        <div key={tool.id} className="relative flex items-start">
                            <div className="flex h-6 items-center">
                                <input
                                    id={tool.id}
                                    name={tool.id}
                                    type="checkbox"
                                    checked={data.llmConfig.tools.includes(tool.id)}
                                    onChange={() => handleToolToggle(tool.id)}
                                    className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-brand-primary focus:ring-brand-primary"
                                />
                            </div>
                            <div className="ml-3 text-sm leading-6">
                                <label htmlFor={tool.id} className="font-medium text-gray-200">{tool.name}</label>
                                <p className="text-gray-400">{tool.description}</p>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>

        </div>
    );
};

export default Step3_Configuration;

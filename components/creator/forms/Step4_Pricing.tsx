
import React from 'react';
import { NewAgentData } from '../../../types';
import { CreditIcon, InfoIcon } from '../../icons/Icons';

interface Step4PricingProps {
    data: NewAgentData;
    updateData: (data: Partial<NewAgentData>) => void;
}

const Step4_Pricing: React.FC<Step4PricingProps> = ({ data, updateData }) => {
    
    const handleConfigChange = (field: keyof NewAgentData['pricingConfig'], value: any) => {
        updateData({ pricingConfig: { ...data.pricingConfig, [field]: value } });
    };

    return (
        <div className="space-y-6 rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div>
                <label htmlFor="pricePerRun" className="block text-sm font-medium text-gray-300">Price per Run</label>
                <div className="relative mt-1 rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <CreditIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="number"
                        name="pricePerRun"
                        id="pricePerRun"
                        value={data.pricingConfig.pricePerRun}
                        onChange={(e) => handleConfigChange('pricePerRun', parseInt(e.target.value, 10) || 0)}
                        className="block w-full rounded-md border-gray-600 bg-gray-700 pl-10 text-white focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                        placeholder="0"
                        min="0"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-gray-400 sm:text-sm">credits</span>
                    </div>
                </div>
            </div>

            <div className="relative flex items-start border-t border-gray-700 pt-6">
                <div className="flex h-6 items-center">
                    <input
                        id="demoEnabled"
                        aria-describedby="demo-description"
                        name="demoEnabled"
                        type="checkbox"
                        checked={data.pricingConfig.demoEnabled}
                        onChange={(e) => handleConfigChange('demoEnabled', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-brand-primary focus:ring-brand-primary"
                    />
                </div>
                <div className="ml-3 text-sm leading-6">
                    <label htmlFor="demoEnabled" className="font-medium text-gray-200">
                        Enable Free Demo
                    </label>
                    <p id="demo-description" className="text-gray-400">
                        Allow users to try your agent for free a limited number of times.
                    </p>
                </div>
            </div>
            
            {data.pricingConfig.demoEnabled && (
                 <div>
                    <label htmlFor="freeRuns" className="block text-sm font-medium text-gray-300">Free Demo Runs</label>
                    <input
                        type="number"
                        name="freeRuns"
                        id="freeRuns"
                        value={data.pricingConfig.freeRuns}
                        onChange={(e) => handleConfigChange('freeRuns', parseInt(e.target.value, 10) || 0)}
                        className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                        placeholder="3"
                        min="1"
                    />
                    <p className="mt-2 text-xs text-gray-500 flex items-start gap-1.5">
                        <InfoIcon className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        This is the number of times a user can run the agent for free.
                    </p>
                </div>
            )}
        </div>
    );
};

export default Step4_Pricing;

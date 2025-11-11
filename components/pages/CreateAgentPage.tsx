

import React, { useState } from 'react';
import { Page } from '../../App';
import AgentCreationStepper from '../creator/AgentCreationStepper';
import Step1_Basics from '../creator/forms/Step1_Basics';
import Step2_Inputs from '../creator/forms/Step2_Inputs';
import Step3_Configuration from '../creator/forms/Step3_Configuration';
import Step4_Pricing from '../creator/forms/Step4_Pricing';
import Step5_Review from '../creator/forms/Step5_Review';
import SuccessModal from '../creator/SuccessModal';
import { NewAgentData } from '../../types';
import { mockLLMModels } from '../../constants';
import { LoadingSpinnerIcon } from '../icons/Icons';

interface CreateAgentPageProps {
    setCurrentPage: (page: Page) => void;
}

const CreateAgentPage: React.FC<CreateAgentPageProps> = ({ setCurrentPage }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [isSuccessModalOpen, setSuccessModalOpen] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [agentData, setAgentData] = useState<NewAgentData>({
        // Step 1
        name: '',
        description: '',
        category: '',
        tags: [],
        // Step 2
        inputSchema: [],
        // Step 3
        llmConfig: {
            model: mockLLMModels[0].id,
            systemPrompt: 'You are a helpful AI assistant.',
            tools: [],
        },
        // Step 4
        pricingConfig: {
            pricePerRun: 10,
            demoEnabled: true,
            freeRuns: 3,
        }
    });

    const handleNext = () => {
        if (currentStep < 5) {
            setCurrentStep(prev => prev + 1);
        } else {
            // This is where the publish logic would go
            setIsPublishing(true);
            setTimeout(() => {
                setSuccessModalOpen(true);
                setIsPublishing(false);
            }, 1500);
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => prev - 1);
    };

    const goToStep = (step: number) => {
        if (step < currentStep) {
            setCurrentStep(step);
        }
    }

    const updateAgentData = (data: Partial<NewAgentData>) => {
        setAgentData(prev => ({ ...prev, ...data }));
    };
    
    const handleGoToDashboard = () => {
        setSuccessModalOpen(false);
        setCurrentPage('creatorDashboard');
    };

    const renderStep = () => {
        switch(currentStep) {
            case 1:
                return <Step1_Basics data={agentData} updateData={updateAgentData} />;
            case 2:
                return <Step2_Inputs data={agentData} updateData={updateAgentData} />;
            case 3:
                return <Step3_Configuration data={agentData} updateData={updateAgentData} />;
            case 4:
                return <Step4_Pricing data={agentData} updateData={updateAgentData} />;
            case 5:
                return <Step5_Review data={agentData} goToStep={goToStep} />;
            default:
                return <div>Step {currentStep}</div>;
        }
    };

    return (
        <>
            <div className="container mx-auto max-w-screen-lg px-4 py-12">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Create a New Agent</h1>
                    <p className="mt-2 text-lg text-gray-400">Follow the steps below to build and publish your agent.</p>
                </div>

                <AgentCreationStepper currentStep={currentStep} onStepClick={goToStep} />
                
                <div className="mt-12">
                    {renderStep()}
                </div>

                <div className="mt-10 flex justify-between gap-4 border-t border-gray-700 pt-6">
                    <button 
                        onClick={() => {
                            if (confirm('Are you sure you want to exit? Any unsaved changes will be lost.')) {
                                setCurrentPage('creatorDashboard');
                            }
                        }}
                        className="h-10 items-center justify-center rounded-md border border-gray-700 bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                        Exit
                    </button>

                    <div className="flex justify-end gap-4">
                        {currentStep > 1 && (
                            <button 
                                onClick={handleBack}
                                className="h-10 items-center justify-center rounded-md border border-gray-700 bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            >
                                Back
                            </button>
                        )}
                        <button 
                            onClick={handleNext}
                            disabled={isPublishing}
                            className="inline-flex h-10 w-36 items-center justify-center rounded-md bg-brand-primary px-6 text-sm font-medium text-white shadow transition-colors hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                        {isPublishing ? <LoadingSpinnerIcon className="h-5 w-5" /> : (currentStep === 5 ? 'Confirm & Publish' : 'Next')}
                        </button>
                    </div>
                </div>
            </div>
            <SuccessModal
                isOpen={isSuccessModalOpen}
                onClose={handleGoToDashboard}
                agentName={agentData.name}
                onViewAgent={handleGoToDashboard} // In a real app, this would navigate to the new agent's page
                onGoToDashboard={handleGoToDashboard}
            />
        </>
    );
};

export default CreateAgentPage;

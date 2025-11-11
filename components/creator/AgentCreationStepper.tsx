
import React from 'react';
import { CheckIcon } from '../icons/Icons';

interface AgentCreationStepperProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

const STEPS = ['Basics', 'Inputs', 'Configuration', 'Pricing', 'Review'];

const AgentCreationStepper: React.FC<AgentCreationStepperProps> = ({ currentStep, onStepClick }) => {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {STEPS.map((step, stepIdx) => (
          <li key={step} className={`relative ${stepIdx !== STEPS.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
            {stepIdx < currentStep - 1 ? (
              // Completed Step
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-brand-primary" />
                </div>
                <button
                  onClick={() => onStepClick(stepIdx + 1)}
                  className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary transition-transform hover:scale-110"
                >
                  <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                  <span className="sr-only">{step}</span>
                </button>
                <div className="absolute -bottom-7 w-max text-center text-xs text-white">{step}</div>
              </>
            ) : stepIdx === currentStep - 1 ? (
              // Current Step
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-700" />
                </div>
                <button
                  onClick={() => onStepClick(stepIdx + 1)}
                  className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-primary bg-gray-800"
                  aria-current="step"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-primary" aria-hidden="true" />
                  <span className="sr-only">{step}</span>
                </button>
                 <div className="absolute -bottom-7 w-max text-center text-xs font-semibold text-brand-primary">{step}</div>
              </>
            ) : (
              // Upcoming Step
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-700" />
                </div>
                <div
                  className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-600 bg-gray-800"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-transparent" aria-hidden="true" />
                  <span className="sr-only">{step}</span>
                </div>
                 <div className="absolute -bottom-7 w-max text-center text-xs text-gray-400">{step}</div>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default AgentCreationStepper;

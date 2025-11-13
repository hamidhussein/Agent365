// @ts-nocheck

import React, { Fragment } from 'react';
import { CheckIcon } from '../icons/Icons';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentName: string;
  onViewAgent: () => void;
  onGoToDashboard: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose, agentName, onViewAgent, onGoToDashboard }) => {
  if (!isOpen) return null;

  return (
    <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm transition-opacity" />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-gray-800 border border-gray-700 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <div className="bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20 sm:mx-0 sm:h-10 sm:w-10">
                  <CheckIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 className="text-base font-semibold leading-6 text-white" id="modal-title">
                    Agent Published Successfully
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-400">
                      Congratulations! Your agent, <span className="font-bold text-white">{agentName}</span>, is now live on the marketplace.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                onClick={onViewAgent}
                className="inline-flex w-full justify-center rounded-md bg-brand-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary/90 sm:ml-3 sm:w-auto"
              >
                View Agent
              </button>
              <button
                type="button"
                onClick={onGoToDashboard}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-200 shadow-sm ring-1 ring-inset ring-gray-600 hover:bg-gray-600 sm:mt-0 sm:w-auto"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;

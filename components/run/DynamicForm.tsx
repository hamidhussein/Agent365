

import React, { useState } from 'react';
import { InputField } from '../../types';
import { CreditIcon, LoadingSpinnerIcon } from '../icons/Icons';

interface DynamicFormProps {
    schema: InputField[];
    onSubmit: (data: Record<string, any>) => void;
    price: number;
}

const DynamicForm: React.FC<DynamicFormProps> = ({ schema, onSubmit, price }) => {
    const initialFormState = schema.reduce((acc, field) => {
        acc[field.name] = '';
        return acc;
    }, {} as Record<string, any>);
    
    const [formData, setFormData] = useState(initialFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate a short delay to show loading feedback before parent state change
        setTimeout(() => {
            onSubmit(formData);
            // The parent component will handle unmounting this form, 
            // so we don't strictly need to reset isSubmitting here.
        }, 500);
    };

    if (schema.length === 0) {
        return (
            <div className="text-center">
                <p className="text-gray-400 mb-4">This agent requires no inputs to run.</p>
                 <button 
                    onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent<HTMLFormElement>)}
                    disabled={isSubmitting}
                    className="inline-flex w-full h-11 items-center justify-center rounded-md bg-brand-primary px-6 text-base font-medium text-white shadow transition-colors hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed">
                     {isSubmitting ? <LoadingSpinnerIcon className="h-5 w-5" /> : 'Run Agent'}
                </button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Inputs</h2>
            {schema.map(field => (
                <div key={field.id}>
                    <label htmlFor={field.name} className="block text-sm font-medium text-gray-300">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.type === 'text' && (
                        <input
                            type="text"
                            name={field.name}
                            id={field.name}
                            value={formData[field.name]}
                            onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
                            placeholder={field.placeholder}
                            required={field.required}
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                        />
                    )}
                     {field.type === 'textarea' && (
                        <textarea
                            name={field.name}
                            id={field.name}
                            rows={5}
                            value={formData[field.name]}
                            onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
                            placeholder={field.placeholder}
                            required={field.required}
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                        />
                    )}
                    {field.type === 'number' && (
                         <input
                            type="number"
                            name={field.name}
                            id={field.name}
                            value={formData[field.name]}
                            onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
                            placeholder={field.placeholder}
                            required={field.required}
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                        />
                    )}
                    {field.type === 'select' && (
                        <select
                            name={field.name}
                            id={field.name}
                            value={formData[field.name]}
                            onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
                            required={field.required}
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                        >
                            <option value="">Select an option</option>
                            {field.options?.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    )}
                </div>
            ))}
            <div className="border-t border-gray-700 pt-6">
                 <button type="submit" disabled={isSubmitting} className="inline-flex w-full h-11 items-center justify-center rounded-md bg-brand-primary px-6 text-base font-medium text-white shadow transition-colors hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed">
                    {isSubmitting ? <LoadingSpinnerIcon className="h-5 w-5" /> : 'Run Agent'}
                </button>
                <p className="mt-3 text-center text-sm text-gray-400 flex items-center justify-center gap-1.5">
                    <CreditIcon className="h-4 w-4 text-green-400" />
                    This will cost {price} credits to run.
                </p>
            </div>
        </form>
    );
};

export default DynamicForm;

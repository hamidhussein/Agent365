
import React from 'react';
import { NewAgentData, InputField, InputFieldType } from '../../../types';
import { PlusCircleIcon, TrashIcon } from '../../icons/Icons';

interface Step2InputsProps {
    data: NewAgentData;
    updateData: (data: Partial<NewAgentData>) => void;
}

const InputFieldEditor: React.FC<{
    field: InputField;
    updateField: (field: InputField) => void;
    removeField: () => void;
}> = ({ field, updateField, removeField }) => {
    
    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...(field.options || [])];
        newOptions[index] = { ...newOptions[index], label: value, value: value.toLowerCase().replace(/\s+/g, '_') };
        updateField({ ...field, options: newOptions });
    };
    
    const addOption = () => {
        const newOptions = [...(field.options || []), { value: '', label: '' }];
        updateField({ ...field, options: newOptions });
    };

    const removeOption = (index: number) => {
        const newOptions = (field.options || []).filter((_, i) => i !== index);
        updateField({ ...field, options: newOptions });
    }

    return (
        <div className="space-y-4 rounded-md border border-gray-600 p-4">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white uppercase">{field.type} Field</span>
                <button onClick={removeField} className="text-gray-400 hover:text-red-500">
                    <TrashIcon className="h-5 w-5" />
                </button>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">Label</label>
                <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField({ ...field, label: e.target.value, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                    placeholder="e.g., Your Name"
                />
            </div>
            { (field.type === 'text' || field.type === 'textarea' || field.type === 'number') &&
                <div>
                    <label className="block text-sm font-medium text-gray-300">Placeholder</label>
                    <input
                        type="text"
                        value={field.placeholder}
                        onChange={(e) => updateField({ ...field, placeholder: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                        placeholder="e.g., Enter your full name"
                    />
                </div>
            }
             { field.type === 'select' &&
                <div>
                    <label className="block text-sm font-medium text-gray-300">Options</label>
                    <div className="space-y-2 mt-1">
                        {(field.options || []).map((option, index) => (
                             <div key={index} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={option.label}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    className="block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                                    placeholder={`Option ${index + 1}`}
                                />
                                <button onClick={() => removeOption(index)} className="text-gray-400 hover:text-red-500">
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                     <button onClick={addOption} className="mt-2 text-sm text-brand-primary hover:text-brand-primary/80">
                        + Add Option
                    </button>
                </div>
            }
            <div className="flex items-center">
                <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField({ ...field, required: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-brand-primary focus:ring-brand-primary"
                />
                <label className="ml-2 block text-sm text-gray-300">Required</label>
            </div>
        </div>
    );
}

const Step2_Inputs: React.FC<Step2InputsProps> = ({ data, updateData }) => {
    
    const addField = (type: InputFieldType) => {
        const newField: InputField = {
            id: `field_${Date.now()}`,
            name: '',
            label: '',
            type,
            required: false,
            ...(type === 'select' && { options: [{value: 'option_1', label: 'Option 1'}] }),
        };
        updateData({ inputSchema: [...data.inputSchema, newField] });
    };

    const updateField = (index: number, field: InputField) => {
        const newSchema = [...data.inputSchema];
        newSchema[index] = field;
        updateData({ inputSchema: newSchema });
    };

    const removeField = (index: number) => {
        const newSchema = data.inputSchema.filter((_, i) => i !== index);
        updateData({ inputSchema: newSchema });
    }

    return (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Left side: Builder */}
            <div className="space-y-6 rounded-lg border border-gray-700 bg-gray-800/50 p-6">
                <h3 className="text-lg font-semibold text-white">Input Schema Builder</h3>
                
                <div className="space-y-4">
                    {data.inputSchema.map((field, index) => (
                        <InputFieldEditor
                            key={field.id}
                            field={field}
                            updateField={(updatedField) => updateField(index, updatedField)}
                            removeField={() => removeField(index)}
                        />
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-700">
                    <button onClick={() => addField('text')} className="flex items-center justify-center gap-2 rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600">
                        <PlusCircleIcon className="h-4 w-4" /> Text
                    </button>
                    <button onClick={() => addField('textarea')} className="flex items-center justify-center gap-2 rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600">
                       <PlusCircleIcon className="h-4 w-4" /> Text Area
                    </button>
                    <button onClick={() => addField('number')} className="flex items-center justify-center gap-2 rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600">
                       <PlusCircleIcon className="h-4 w-4" /> Number
                    </button>
                    <button onClick={() => addField('select')} className="flex items-center justify-center gap-2 rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600">
                       <PlusCircleIcon className="h-4 w-4" /> Select
                    </button>
                </div>
            </div>

            {/* Right side: Preview */}
            <div className="sticky top-24">
                 <div className="space-y-6 rounded-lg border border-dashed border-gray-600 bg-gray-800/30 p-6">
                    <h3 className="text-lg font-semibold text-white">Live Preview</h3>
                    <div className="space-y-4">
                        {data.inputSchema.length === 0 ? (
                            <p className="text-center text-sm text-gray-400">Add input fields to see a preview of the user form.</p>
                        ) : (
                            data.inputSchema.map(field => (
                                <div key={field.id}>
                                    <label className="block text-sm font-medium text-gray-300">
                                        {field.label || 'Field Label'} {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    {field.type === 'text' && <input type="text" placeholder={field.placeholder} className="mt-1 block w-full cursor-not-allowed rounded-md border-gray-600 bg-gray-700 text-white" disabled />}
                                    {field.type === 'textarea' && <textarea rows={3} placeholder={field.placeholder} className="mt-1 block w-full cursor-not-allowed rounded-md border-gray-600 bg-gray-700 text-white" disabled />}
                                    {field.type === 'number' && <input type="number" placeholder={field.placeholder} className="mt-1 block w-full cursor-not-allowed rounded-md border-gray-600 bg-gray-700 text-white" disabled />}
                                    {field.type === 'select' && (
                                        <select className="mt-1 block w-full cursor-not-allowed rounded-md border-gray-600 bg-gray-700 text-white" disabled>
                                            {(field.options || []).map(opt => <option key={opt.value}>{opt.label}</option>)}
                                        </select>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                 </div>
            </div>
        </div>
    );
};

export default Step2_Inputs;

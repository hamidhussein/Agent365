
import React, { useState } from 'react';
import { categories } from '../../../constants';
import { XIcon } from '../../icons/Icons';

interface Step1BasicsProps {
    data: {
        name: string;
        description: string;
        category: string;
        tags: string[];
    };
    updateData: (data: Partial<Step1BasicsProps['data']>) => void;
}

const Step1_Basics: React.FC<Step1BasicsProps> = ({ data, updateData }) => {
    const [tagInput, setTagInput] = useState('');

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim() !== '') {
            e.preventDefault();
            const newTags = [...new Set([...data.tags, tagInput.trim()])];
            if (newTags.length <= 5) {
                updateData({ tags: newTags });
                setTagInput('');
            }
        }
    };

    const removeTag = (tagToRemove: string) => {
        updateData({ tags: data.tags.filter(tag => tag !== tagToRemove) });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        updateData({ [e.target.name]: e.target.value });
    };

    return (
        <div className="space-y-6 rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">Agent Name</label>
                <input
                    type="text"
                    name="name"
                    id="name"
                    value={data.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                    placeholder="e.g., Content Proofer"
                />
            </div>

            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300">Description</label>
                <textarea
                    name="description"
                    id="description"
                    rows={3}
                    value={data.description}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                    placeholder="A short, catchy description of what your agent does."
                />
                <p className="mt-2 text-xs text-gray-500">This will be shown on the agent card in the marketplace.</p>
            </div>

            <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-300">Category</label>
                <select
                    id="category"
                    name="category"
                    value={data.category}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

             <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-300">Tags</label>
                <input
                    type="text"
                    name="tags"
                    id="tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                    placeholder="Add up to 5 tags and press Enter"
                    disabled={data.tags.length >= 5}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                    {data.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-x-1 rounded-full bg-brand-primary/20 px-2 py-1 text-xs font-medium text-brand-primary">
                            {tag}
                            <button type="button" onClick={() => removeTag(tag)} className="group relative -mr-1 h-3.5 w-3.5 rounded-sm hover:bg-brand-primary/50">
                                <span className="sr-only">Remove</span>
                                <XIcon className="h-3.5 w-3.5 text-brand-primary/80 group-hover:text-white" />
                            </button>
                        </span>
                    ))}
                </div>
                 <p className="mt-2 text-xs text-gray-500">{5 - data.tags.length} tags remaining.</p>
            </div>
        </div>
    );
};

export default Step1_Basics;
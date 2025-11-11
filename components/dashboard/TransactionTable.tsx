
import React from 'react';
import { Transaction } from '../../types';

interface TransactionTableProps {
    transactions: Transaction[];
}

const StatusBadge: React.FC<{ status: Transaction['status'] }> = ({ status }) => {
    const baseClasses = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';
    const statusClasses = {
        Completed: 'bg-green-500/20 text-green-400',
        Pending: 'bg-yellow-500/20 text-yellow-400',
        Failed: 'bg-red-500/20 text-red-400',
    };
    return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions }) => {
    return (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800/60">
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Date</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Description</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Amount</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {transactions.map((txn) => (
                            <tr key={txn.id} className="hover:bg-gray-800/40">
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-400 sm:pl-6">{txn.date}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-white">{txn.description}</td>
                                <td className={`whitespace-nowrap px-3 py-4 text-sm font-medium ${txn.type === 'purchase' ? 'text-green-400' : 'text-red-400'}`}>
                                    {txn.type === 'purchase' ? '+' : ''}{txn.amount.toLocaleString()}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                    <StatusBadge status={txn.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TransactionTable;

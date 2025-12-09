import React from 'react';
import { Transaction } from '../../types';

interface TransactionTableProps {
    transactions: Transaction[];
}

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions }) => {
    return (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800/60">
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Date</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Description</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Type</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {transactions.map((txn) => (
                            <tr key={txn.id} className="hover:bg-gray-800/40">
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-400 sm:pl-6">
                                    {new Date(txn.created_at).toLocaleDateString()}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-white">{txn.description}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 capitalize">
                                    {txn.transaction_type}
                                </td>
                                <td className={`whitespace-nowrap px-3 py-4 text-sm font-medium ${['purchase', 'bonus', 'refund'].includes(txn.transaction_type) ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                    {['purchase', 'bonus', 'refund'].includes(txn.transaction_type) ? '+' : ''}{txn.amount.toLocaleString()}
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

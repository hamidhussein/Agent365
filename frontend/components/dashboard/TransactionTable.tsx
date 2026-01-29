import React from 'react';
import { Transaction } from '../../types';

interface TransactionTableProps {
    transactions: Transaction[];
}

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions }) => {
    return (
        <div className="rounded-lg border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-secondary">
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-muted-foreground sm:pl-6">Date</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground">Description</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground">Type</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {transactions.map((txn) => (
                            <tr key={txn.id} className="hover:bg-secondary/20 transition-colors">
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-foreground sm:pl-6">
                                    {new Date(txn.created_at).toLocaleDateString()}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">{txn.description}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground capitalize">
                                    {txn.transaction_type}
                                </td>
                                <td className={`whitespace-nowrap px-3 py-4 text-sm font-medium ${['purchase', 'bonus', 'refund'].includes(txn.transaction_type) ? 'text-green-600' : 'text-red-600'
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

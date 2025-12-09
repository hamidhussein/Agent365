import axiosInstance from './client';
import { Execution, Transaction } from '../../../types';

export const fetchUserExecutions = async (skip = 0, limit = 10): Promise<Execution[]> => {
    const response = await axiosInstance.get<Execution[]>('/executions', {
        params: { skip, limit }
    });
    return response.data;
};

export const fetchUserTransactions = async (skip = 0, limit = 10): Promise<Transaction[]> => {
    const response = await axiosInstance.get<Transaction[]>('/credits/transactions', {
        params: { skip, limit }
    });
    return response.data;
};

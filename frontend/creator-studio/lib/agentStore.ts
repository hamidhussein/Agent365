import { Agent } from '../types';

export const addAgent = (agents: Agent[], agent: Agent) => [agent, ...agents];

export const updateAgent = (agents: Agent[], agent: Agent) =>
  agents.map((item) => (item.id === agent.id ? agent : item));

export const removeAgent = (agents: Agent[], id: string) =>
  agents.filter((item) => item.id !== id);

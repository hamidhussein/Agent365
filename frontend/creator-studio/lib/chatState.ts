import { ChatMessage } from '../types';

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `msg_${Math.random().toString(36).slice(2)}`;
};

export const createUserMessage = (text: string, id: string = generateId()): ChatMessage => ({
  id,
  role: 'user',
  text,
  timestamp: new Date()
});

export const createBotMessage = (text: string, id: string = generateId()): ChatMessage => ({
  id,
  role: 'model',
  text,
  timestamp: new Date()
});

export const updateMessageText = (messages: ChatMessage[], id: string, text: string) =>
  messages.map((message) => (message.id === id ? { ...message, text } : message));

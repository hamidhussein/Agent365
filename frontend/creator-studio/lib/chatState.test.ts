import { createBotMessage, createUserMessage, updateMessageText } from './chatState';

describe('chatState', () => {
  it('creates user and bot messages with correct roles', () => {
    const userMsg = createUserMessage('Hello', 'user-1');
    const botMsg = createBotMessage('Hi', 'bot-1');
    expect(userMsg.role).toBe('user');
    expect(botMsg.role).toBe('model');
  });

  it('updates message text by id', () => {
    const first = createUserMessage('First', '1');
    const second = createBotMessage('Second', '2');
    const updated = updateMessageText([first, second], '2', 'Updated');
    expect(updated[1].text).toBe('Updated');
  });
});

import { addAgent, updateAgent, removeAgent } from './agentStore';
import { Agent } from '../types';

const buildAgent = (id: string, name = 'Agent'): Agent => ({
  id,
  name,
  description: 'desc',
  instruction: 'instruction',
  model: 'gemini-3-flash-preview',
  files: [],
  inputs: [],
  isPublic: false,
  creditsPerRun: 1,
  createdAt: new Date().toISOString(),
  color: 'bg-blue-500'
});

describe('agentStore', () => {
  it('adds an agent to the front of the list', () => {
    const agents = [buildAgent('1'), buildAgent('2')];
    const added = buildAgent('3');
    const result = addAgent(agents, added);
    expect(result[0].id).toBe('3');
    expect(result).toHaveLength(3);
  });

  it('updates an agent by id', () => {
    const agents = [buildAgent('1'), buildAgent('2')];
    const updated = { ...agents[1], name: 'Updated' };
    const result = updateAgent(agents, updated);
    expect(result[1].name).toBe('Updated');
  });

  it('removes an agent by id', () => {
    const agents = [buildAgent('1'), buildAgent('2')];
    const result = removeAgent(agents, '1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });
});


import React, { useState, useRef, useEffect } from 'react';
import { Agent } from '../../types';
import { PlusCircleIcon, PencilIcon, TrashIcon, MoreVerticalIcon, EyeIcon } from '../icons/Icons';
import { Page } from '../../App';

interface MyAgentsListProps {
  agents: Agent[];
  onNavigate: (page: Page) => void;
  onSelectAgent: (agentId: string) => void;
}

const StatusBadge: React.FC<{ status: Agent['status'] }> = ({ status }) => {
  const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
  const statusClasses = {
    Live: 'bg-green-500/20 text-green-400',
    Draft: 'bg-yellow-500/20 text-yellow-400',
    Paused: 'bg-gray-500/20 text-gray-300',
  };
  return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};


const MyAgentsList: React.FC<MyAgentsListProps> = ({ agents, onNavigate, onSelectAgent }) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">My Agents</h2>
        <button
          onClick={() => onNavigate('createAgent')}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
          <PlusCircleIcon className="h-5 w-5 mr-2" />
          Create New Agent
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-secondary">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-muted-foreground sm:pl-6">Agent</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground">Status</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground">Runs</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground">Rating</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground">Price</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {agents.map((agent) => (
              <tr key={agent.id} className="hover:bg-secondary/20">
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      <img className="h-10 w-10 rounded-md object-cover" src={agent.imageUrl} alt="" />
                    </div>
                    <div className="ml-4">
                      <div className="font-medium text-foreground">{agent.name}</div>
                      <div className="text-muted-foreground">{agent.id}</div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">
                  <StatusBadge status={agent.status} />
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">{agent.runs.toLocaleString()}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">{agent.rating} ({agent.reviewCount})</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">{agent.price} credits</td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                  <button onClick={() => setOpenMenuId(openMenuId === agent.id ? null : agent.id)} className="text-muted-foreground hover:text-foreground">
                    <MoreVerticalIcon className="h-5 w-5" />
                    <span className="sr-only">Actions for {agent.name}</span>
                  </button>
                  {openMenuId === agent.id && (
                    <div ref={menuRef} className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-card shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-border">
                      <div className="py-1">
                        <button onClick={() => { onSelectAgent(agent.id); setOpenMenuId(null); }} className="flex items-center w-full px-4 py-2 text-left text-sm text-foreground hover:bg-secondary hover:text-primary">
                          <EyeIcon className="h-4 w-4 mr-3" /> View
                        </button>
                        <button className="flex items-center w-full px-4 py-2 text-left text-sm text-foreground hover:bg-secondary hover:text-primary">
                          <PencilIcon className="h-4 w-4 mr-3" /> Edit
                        </button>
                        <button className="flex items-center w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10">
                          <TrashIcon className="h-4 w-4 mr-3" /> Delete
                        </button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyAgentsList;

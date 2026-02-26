import React from 'react';
import { ChevronRight, Layout, MessageSquare, Plus, Pencil } from 'lucide-react';
import { ViewState } from '../../types';

interface BreadcrumbItem {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}

export const Breadcrumbs = ({ 
  view, 
  agentName,
  onNavigate,
  className = "py-4"
}: { 
  view: ViewState;
  agentName?: string;
  onNavigate: (view: ViewState) => void;
  className?: string;
}) => {
  const items: BreadcrumbItem[] = [
    {
      label: 'Studio',
      icon: <Layout size={14} />,
      onClick: () => onNavigate('dashboard')
    }
  ];

  if (view === 'admin-dashboard') {
    items.push({
      label: 'Admin',
      icon: <Shield size={14} />,
      active: true
    });
  } else if (view === 'create-agent') {
    items.push({
      label: 'New Agent',
      icon: <Plus size={14} />,
      active: true
    });
  } else if (view === 'edit-agent') {
    items.push({
      label: 'Edit Agent',
      icon: <Pencil size={14} />,
      active: true
    });
    if (agentName) {
      items.push({
        label: agentName,
        icon: null,
        active: true
      });
    }
  } else if (view === 'chat') {
    items.push({
      label: 'Chat',
      icon: <MessageSquare size={14} />,
      onClick: () => onNavigate('dashboard')
    });
    if (agentName) {
      items.push({
        label: agentName,
        icon: null,
        active: true
      });
    }
  } else {
    items[0].active = true;
  }

  return (
    <nav className={`flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground/60 overflow-x-auto no-scrollbar ${className}`}>
      {items.map((item, idx) => (
        <React.Fragment key={item.label}>
          {idx > 0 && <ChevronRight size={12} className="shrink-0 text-muted-foreground/30" />}
          <button
            onClick={item.onClick}
            disabled={item.active || !item.onClick}
            className={`flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              item.active 
                ? 'text-foreground' 
                : 'hover:text-foreground cursor-pointer'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};

const Shield = ({ size }: { size: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </svg>
);

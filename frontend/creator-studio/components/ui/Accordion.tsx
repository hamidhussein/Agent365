import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  onToggle?: (isOpen: boolean) => void;
}

export const Accordion = ({ 
  title, 
  icon, 
  children, 
  defaultOpen = false, 
  className = '',
  onToggle 
}: AccordionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (onToggle) onToggle(nextState);
  };

  return (
    <div className={`border border-slate-800/50 rounded-2xl overflow-hidden bg-slate-900/40 backdrop-blur-sm transition-all duration-300 ${isOpen ? 'ring-1 ring-blue-500/30 bg-slate-900/60 shadow-lg shadow-blue-500/5' : 'hover:border-slate-700/80'} ${className}`}>
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-3">
          {icon && <span className={`transition-all duration-300 ${isOpen ? 'text-blue-400 scale-110' : 'text-slate-400 group-hover:text-slate-200'}`}>{icon}</span>}
          <span className={`font-semibold transition-colors ${isOpen ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{title}</span>
        </div>
        <ChevronDown 
          size={18} 
          className={`text-slate-500 transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isOpen ? 'rotate-180 text-blue-400' : 'group-hover:text-slate-300'}`} 
        />
      </button>
      
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="p-6 pt-0 border-t border-slate-800/20">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};



export const Input = ({ label, className = '', ...props }: any) => (
  <div className={`flex flex-col gap-1.5 mb-4 ${className}`}>
    {label && <label className="text-sm font-medium text-slate-300">{label}</label>}
    <input 
      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
      {...props} 
    />
  </div>
);

export const TextArea = ({ label, ...props }: any) => (
  <div className="flex flex-col gap-1.5 mb-4">
    {label && <label className="text-sm font-medium text-slate-300">{label}</label>}
    <textarea 
      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors min-h-[100px] resize-y placeholder-slate-500"
      {...props} 
    />
  </div>
);


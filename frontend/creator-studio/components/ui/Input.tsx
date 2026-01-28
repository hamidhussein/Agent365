export const Input = ({ label, className = '', ...props }: any) => (
  <div className={`flex flex-col gap-1.5 mb-4 ${className}`}>
    {label && <label className="text-sm font-bold text-foreground">{label}</label>}
    <input
      className={`bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${className}`}
      {...props}
    />
  </div>
);

export const TextArea = ({ label, className = '', ...props }: any) => (
  <div className="flex flex-col gap-1.5 mb-4 w-full h-full">
    {label && <label className="text-sm font-bold text-foreground">{label}</label>}
    <textarea
      className={`bg-secondary/50 border border-border rounded-xl px-4 py-3 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[100px] resize-y placeholder-muted-foreground shadow-sm leading-relaxed ${className}`}
      {...props}
    />
  </div>
);


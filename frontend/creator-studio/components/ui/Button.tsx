

export const Button = ({ children, variant = 'primary', className = '', onClick, disabled, ...props }: any) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-slate-700 hover:bg-slate-600 text-white focus:ring-slate-500 border border-slate-600",
    danger: "bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800",
    ghost: "hover:bg-slate-800 text-slate-300 hover:text-white",
    outline: "border border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};


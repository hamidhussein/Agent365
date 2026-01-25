

export const Button = ({ children, variant = 'primary', className = '', onClick, disabled, ...props }: any) => {
  const baseStyle = "px-4 py-2 rounded-lg font-bold transition-all inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/10",
    secondary: "bg-secondary text-secondary-foreground hover:bg-muted border border-border shadow-sm",
    danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/10",
    ghost: "hover:bg-muted text-muted-foreground hover:text-foreground",
    outline: "border border-border text-muted-foreground hover:bg-muted hover:text-foreground focus:ring-primary/50"
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


import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost";
};

export function Button({
  className,
  variant = "default",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed";
  const variants = {
    default:
      "bg-emerald-400 text-slate-900 hover:bg-emerald-300 shadow-[0_10px_40px_-18px_rgba(16,185,129,0.8)]",
    secondary:
      "bg-white/10 text-slate-100 border border-white/10 hover:border-emerald-300/60 hover:text-emerald-100",
    ghost: "text-slate-200 hover:text-emerald-200 hover:bg-white/5",
  };

  return (
    <button
      className={cn(base, variants[variant], className)}
      {...props}
    />
  );
}



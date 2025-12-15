import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-slate-800/70 bg-black/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 shadow-inner",
        "transition focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/30 focus:outline-none",
        className
      )}
      {...props}
    />
  );
}



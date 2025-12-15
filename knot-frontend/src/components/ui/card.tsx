import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.9)] backdrop-blur",
        className
      )}
      {...props}
    />
  );
}



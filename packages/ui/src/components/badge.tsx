import type * as React from "react";
import { cn } from "../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "destructive" | "outline";
}

const variantClasses = {
  default: "bg-surface_container text-on_surface_variant",
  success: "bg-secondary_container text-on_secondary_container",
  warning: "bg-tertiary_fixed text-tertiary",
  destructive: "bg-tertiary_fixed text-tertiary",
  outline: "border border-outline_variant/20 bg-surface_container_lowest text-on_surface",
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };

import * as React from "react";
import { cn } from "../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded bg-surface_container_lowest px-3 py-2 text-sm text-on_surface border border-outline_variant/20 focus:outline-none focus:ring-2 focus:ring-primary_fixed focus:bg-white disabled:cursor-not-allowed disabled:bg-surface_dim disabled:text-on_surface_variant transition-all placeholder:text-on_surface_variant/60",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };

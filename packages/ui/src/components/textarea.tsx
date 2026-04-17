import * as React from "react";
import { cn } from "../lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-24 w-full rounded border border-outline_variant/20 bg-surface_container_lowest px-3 py-2 text-sm text-on_surface focus:outline-none focus:ring-2 focus:ring-primary_fixed focus:bg-white disabled:cursor-not-allowed disabled:bg-surface_dim disabled:text-on_surface_variant placeholder:text-on_surface_variant/60 transition-all",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };

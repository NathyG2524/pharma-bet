import * as React from "react";
import { cn } from "../lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded border border-outline_variant/20 bg-surface_container_lowest px-3 py-2 text-sm text-on_surface focus:outline-none focus:ring-2 focus:ring-primary_fixed focus:bg-white disabled:cursor-not-allowed disabled:bg-surface_dim disabled:text-on_surface_variant transition-all",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export { Select };

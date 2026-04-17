import * as React from "react";
import { cn } from "../lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success" | "warning";
  title?: string;
}

const variantClasses = {
  default: "border-outline_variant/20 bg-surface_container_lowest text-on_surface_variant",
  destructive: "border-outline_variant/20 bg-tertiary_fixed text-tertiary",
  success: "border-outline_variant/20 bg-secondary_container text-on_secondary_container",
  warning: "border-outline_variant/20 bg-tertiary_fixed text-tertiary",
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", title, children, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn("rounded-lg border p-3 text-sm", variantClasses[variant], className)}
      {...props}
    >
      {title && <p className="mb-1 font-medium">{title}</p>}
      {children}
    </div>
  ),
);
Alert.displayName = "Alert";

export { Alert };

import * as React from "react";
import { cn } from "../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "tertiary" | "outline" | "destructive";
  size?: "default" | "sm" | "lg";
}

const variantClasses = {
  default:
    "bg-gradient-to-b from-primary to-primary_container text-white hover:brightness-110 shadow-sm",
  primary:
    "bg-gradient-to-b from-primary to-primary_container text-white hover:brightness-110 shadow-sm",
  secondary: "bg-secondary text-white hover:brightness-110 shadow-sm",
  tertiary: "bg-tertiary text-white hover:brightness-110 shadow-sm",
  outline: "border border-outline_variant/20 bg-surface text-on_surface hover:bg-surface_container",
  destructive: "bg-tertiary text-white hover:brightness-110 shadow-sm",
};

const sizeClasses = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3 text-sm",
  lg: "h-11 px-6 text-base",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary_fixed focus:ring-offset-2 focus:ring-offset-surface disabled:pointer-events-none disabled:bg-surface_dim disabled:text-on_surface_variant",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button };

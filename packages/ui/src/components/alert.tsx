import * as React from 'react';
import { cn } from '../lib/utils';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  title?: string;
}

const variantClasses = {
  default: 'border-gray-200 bg-gray-50 text-gray-800',
  destructive: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', title, children, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'rounded-lg border p-3 text-sm',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {title && <p className="mb-1 font-medium">{title}</p>}
      {children}
    </div>
  ),
);
Alert.displayName = 'Alert';

export { Alert };

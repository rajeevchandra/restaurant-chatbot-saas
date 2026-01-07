import { cn } from '@/lib/utils';

type StatusPillVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusPillProps {
  label: string;
  variant?: StatusPillVariant;
  className?: string;
}

const variantStyles: Record<StatusPillVariant, string> = {
  success: 'bg-green-50 text-green-700 ring-green-600/20',
  warning: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  error: 'bg-red-50 text-red-700 ring-red-600/20',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  neutral: 'bg-gray-50 text-gray-700 ring-gray-600/20',
};

export function StatusPill({ label, variant = 'neutral', className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        variantStyles[variant],
        className
      )}
    >
      {label}
    </span>
  );
}

export function getOrderStatusVariant(status: string): StatusPillVariant {
  const statusMap: Record<string, StatusPillVariant> = {
    COMPLETED: 'success',
    PAID: 'success',
    READY: 'info',
    PREPARING: 'info',
    ACCEPTED: 'info',
    PAYMENT_PENDING: 'warning',
    CREATED: 'neutral',
    CANCELLED: 'error',
  };
  return statusMap[status] || 'neutral';
}

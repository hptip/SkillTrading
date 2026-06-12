import { cn } from '@/utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
  size?: 'sm' | 'md';
  className?: string;
}

const variantClasses = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  secondary: 'bg-violet-100 text-violet-700',
};

export const Badge = ({ children, variant = 'default', size = 'sm', className }: BadgeProps) => (
  <span className={cn(
    'inline-flex items-center font-medium rounded-full',
    size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
    variantClasses[variant],
    className
  )}>
    {children}
  </span>
);

export const statusBadge = (status: string) => {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    PENDING: { variant: 'warning', label: 'Pending' },
    APPROVED: { variant: 'success', label: 'Approved' },
    REJECTED: { variant: 'danger', label: 'Rejected' },
    CONFIRMED: { variant: 'info', label: 'Confirmed' },
    COMPLETED: { variant: 'success', label: 'Completed' },
    CANCELLED: { variant: 'danger', label: 'Cancelled' },
    DISPUTED: { variant: 'danger', label: 'Disputed' },
    ACTIVE: { variant: 'success', label: 'Active' },
    SUSPENDED: { variant: 'warning', label: 'Suspended' },
    BANNED: { variant: 'danger', label: 'Banned' },
    BONUS: { variant: 'success', label: 'Bonus' },
    HOLD: { variant: 'warning', label: 'Hold' },
    RELEASE: { variant: 'info', label: 'Release' },
    EARN: { variant: 'success', label: 'Earned' },
    SPEND: { variant: 'danger', label: 'Spent' },
    REFUND: { variant: 'info', label: 'Refund' },
    ADJUST: { variant: 'secondary', label: 'Adjusted' },
    FEE: { variant: 'secondary', label: 'Fee' },
  };
  const item = map[status] || { variant: 'default' as BadgeProps['variant'], label: status };
  return <Badge variant={item.variant}>{item.label}</Badge>;
};

import { cn } from '@/utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card = ({ children, className, hover, onClick }: CardProps) => (
  <div
    className={cn(
      'bg-white rounded-2xl border border-gray-100 shadow-sm',
      hover && 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer',
      className
    )}
    onClick={onClick}
  >
    {children}
  </div>
);

export const CardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('px-6 py-4 border-b border-gray-100', className)}>{children}</div>
);

export const CardBody = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('p-6', className)}>{children}</div>
);

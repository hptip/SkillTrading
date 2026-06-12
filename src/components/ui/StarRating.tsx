import { Star } from 'lucide-react';
import { cn } from '@/utils/cn';

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

const sizeMap = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' };

export const StarRating = ({ rating, max = 5, size = 'sm', interactive, onChange }: StarRatingProps) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: max }, (_, i) => {
      const filled = i < Math.round(rating);
      return (
        <Star
          key={i}
          className={cn(
            sizeMap[size],
            filled ? 'fill-amber-400 text-amber-400' : 'text-gray-300',
            interactive && 'cursor-pointer hover:text-amber-400 transition-colors'
          )}
          onClick={() => interactive && onChange?.(i + 1)}
        />
      );
    })}
  </div>
);

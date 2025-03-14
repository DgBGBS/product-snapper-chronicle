
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CategoryNavigationProps {
  categories: string[];
  activeCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

const CategoryNavigation = ({
  categories,
  activeCategory,
  onSelectCategory
}: CategoryNavigationProps) => {
  const [mounted, setMounted] = useState(false);

  // Animation effect on mount
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn(
      "flex flex-wrap items-center gap-2 py-4 transition-opacity duration-500",
      mounted ? "opacity-100" : "opacity-0"
    )}>
      <button
        onClick={() => onSelectCategory(null)}
        className={cn(
          "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
          "bg-background border border-border hover:bg-secondary/80",
          activeCategory === null ? "bg-primary text-primary-foreground border-primary" : ""
        )}
      >
        Todos
      </button>
      
      {categories.map((category, index) => (
        <button
          key={category}
          onClick={() => onSelectCategory(category)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
            "bg-background border border-border hover:bg-secondary/80",
            activeCategory === category ? "bg-primary text-primary-foreground border-primary" : "",
            "animation-delay-200"
          )}
          style={{ 
            animationDelay: `${(index + 1) * 100}ms` 
          }}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

export default CategoryNavigation;

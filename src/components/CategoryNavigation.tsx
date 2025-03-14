
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

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
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);

  // Animation effect on mount
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="mb-6">
      {/* Desktop category navigation */}
      <div className={cn(
        "hidden md:flex flex-wrap items-center gap-2 py-4 transition-opacity duration-500",
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

      {/* Mobile category dropdown */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileCategoriesOpen(!mobileCategoriesOpen)}
          className={cn(
            "w-full px-4 py-2 rounded-md text-sm font-medium transition-colors",
            "bg-background border border-border",
            "flex items-center justify-between"
          )}
        >
          <span>{activeCategory || 'Todas las categorías'}</span>
          <svg 
            className={cn(
              "h-4 w-4 transition-transform",
              mobileCategoriesOpen ? "transform rotate-180" : ""
            )} 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        {mobileCategoriesOpen && (
          <div className="mt-2 p-2 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
            <button
              onClick={() => {
                onSelectCategory(null);
                setMobileCategoriesOpen(false);
              }}
              className={cn(
                "w-full px-4 py-2 rounded-md text-sm text-left",
                "hover:bg-muted transition-colors",
                activeCategory === null ? "bg-primary/10 text-primary font-medium" : ""
              )}
            >
              Todos
            </button>
            
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  onSelectCategory(category);
                  setMobileCategoriesOpen(false);
                }}
                className={cn(
                  "w-full px-4 py-2 rounded-md text-sm text-left",
                  "hover:bg-muted transition-colors",
                  activeCategory === category ? "bg-primary/10 text-primary font-medium" : ""
                )}
              >
                {category}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Command menu for quick category search (accessible with keyboard shortcut) */}
      <div className="hidden">
        <Command>
          <CommandInput placeholder="Buscar categoría..." />
          <CommandList>
            <CommandEmpty>No se encontraron categorías</CommandEmpty>
            <CommandGroup heading="Categorías">
              <CommandItem
                onSelect={() => {
                  onSelectCategory(null);
                  setCommandOpen(false);
                }}
              >
                Todos
              </CommandItem>
              {categories.map((category) => (
                <CommandItem
                  key={category}
                  onSelect={() => {
                    onSelectCategory(category);
                    setCommandOpen(false);
                  }}
                >
                  {category}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </div>
  );
};

export default CategoryNavigation;

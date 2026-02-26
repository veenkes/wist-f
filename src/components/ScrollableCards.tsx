import React, { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useScrollable } from '@/hooks/useScrollable';
import { Button } from '@/components/ui/button';

interface ScrollableCardsProps {
  children: ReactNode;
  className?: string;
}

export const ScrollableCards: React.FC<ScrollableCardsProps> = ({ children, className = '' }) => {
  const { scrollRef, canScrollLeft, canScrollRight, scroll } = useScrollable();

  return (
    <div className={`relative ${className}`}>
      {/* Left scroll indicator and button */}
      {canScrollLeft && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none z-10"></div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-md hover:bg-background hover:shadow-lg transition-all"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </Button>
        </>
      )}

      {/* Right scroll indicator and button */}
      {canScrollRight && (
        <>
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none z-10"></div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-md hover:bg-background hover:shadow-lg transition-all"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="h-4 w-4 text-foreground" />
          </Button>
        </>
      )}

      <div
        ref={scrollRef}
        className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
      >
        <div className="flex gap-4">
          {children}
        </div>
      </div>
    </div>
  );
};


import { useState, useEffect, useRef } from 'react';

export const useScrollable = () => {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkScrollability = () => {
    if (!scrollRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    // Check on mount
    checkScrollability();

    // Check on scroll
    element.addEventListener('scroll', checkScrollability);
    
    // Check on resize
    const resizeObserver = new ResizeObserver(checkScrollability);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener('scroll', checkScrollability);
      resizeObserver.disconnect();
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    const targetScroll = direction === 'right' 
      ? scrollRef.current.scrollLeft + scrollAmount
      : scrollRef.current.scrollLeft - scrollAmount;
    
    scrollRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
  };

  return {
    scrollRef,
    canScrollLeft,
    canScrollRight,
    scroll,
    checkScrollability,
  };
};


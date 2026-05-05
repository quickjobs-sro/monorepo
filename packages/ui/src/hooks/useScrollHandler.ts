import { useCallback, useEffect, useRef, useState } from "react";

const BOTTOM_THRESHOLD = 20;

interface UseScrollHandlerProps {
  onReachBottom?: () => void;
}

/**
 * Custom hook for handling scroll events and showing shadows based on scroll position
 * @returns Object containing functions and states for scroll handling
 */
export const useScrollHandler = ({
  onReachBottom,
}: UseScrollHandlerProps = {}) => {
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [isBottom, setIsBottom] = useState(false);

  const onScroll = useCallback(() => {
    const viewport = containerRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (!viewport) return;

    const { scrollTop, scrollHeight, clientHeight } = viewport as HTMLElement;
    const prevIsBottom = isBottom;

    setShowTopShadow(scrollTop > 0);

    const sumScrollTopClientHeight = scrollTop + clientHeight;
    const targetScrollHeight = scrollHeight - BOTTOM_THRESHOLD;
    const newIsBottom = sumScrollTopClientHeight >= targetScrollHeight;

    setShowBottomShadow(sumScrollTopClientHeight < targetScrollHeight);
    setIsBottom(newIsBottom);

    if (newIsBottom && !prevIsBottom && onReachBottom) {
      onReachBottom();
    }
  }, [isBottom, onReachBottom]);

  const scrollTo = useCallback(
    (
      targetSelector: string,
      targetOffset: number = 0,
      behavior: ScrollBehavior = "smooth"
    ) => {
      const scrollViewportElement = containerRef.current?.querySelector(
        "[data-radix-scroll-area-viewport]"
      ) as HTMLElement | null;

      if (!scrollViewportElement) {
        return;
      }

      const targetElement = scrollViewportElement.querySelector(
        targetSelector
      ) as HTMLElement | null;

      if (!targetElement) {
        return;
      }

      const viewportRect = scrollViewportElement.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();

      const newScrollTop =
        scrollViewportElement.scrollTop +
        (targetRect.top - viewportRect.top) +
        targetOffset;

      if (Math.abs(scrollViewportElement.scrollTop - newScrollTop) > 0.5) {
        scrollViewportElement.scrollTo({
          top: newScrollTop,
          behavior,
        });
      }
    },
    []
  );

  // Handle layout changes to update dimensions
  const onLayout = useCallback(() => {
    const viewport = containerRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (!viewport) return;

    const { clientHeight, scrollHeight } = viewport as HTMLElement;
    setContainerHeight(clientHeight);
    setContentHeight(scrollHeight);

    // Initialize shadow visibility based on content size
    setShowBottomShadow(scrollHeight > clientHeight);
  }, []);

  // Attach scroll event listener when component mounts
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const viewport = container.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (!viewport) return;

    // Initial layout measurement
    onLayout();

    // Initial scroll position check
    onScroll();

    // Add scroll event listener to the viewport
    viewport.addEventListener("scroll", onScroll);

    // Clean up on unmount
    return () => {
      viewport.removeEventListener("scroll", onScroll);
    };
  }, [onScroll, onLayout]);

  // Listen for window resize events
  useEffect(() => {
    const handleResize = () => {
      onLayout();
      onScroll();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [onLayout, onScroll]);

  return {
    containerRef,
    onScroll,
    onLayout,
    showTopShadow,
    showBottomShadow,
    containerHeight,
    contentHeight,
    scrollTo,
    isBottom,
  };
};

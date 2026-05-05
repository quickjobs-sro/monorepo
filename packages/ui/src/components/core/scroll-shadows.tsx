import { cn } from "../../lib/utils";

interface ScrollShadowProps {
  show: boolean;
  className?: string;
}

export const ScrollTopShadow = ({ show, className }: ScrollShadowProps) => {
  return (
    <div
      className={cn(
        "absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-gray-300 to-transparent pointer-events-none z-10 transition-opacity duration-200",
        show ? "opacity-100" : "opacity-0",
        className
      )}
    />
  );
};

export const ScrollBottomShadow = ({ show, className }: ScrollShadowProps) => {
  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-gray-300 to-transparent pointer-events-none z-10 transition-opacity duration-200",
        show ? "opacity-100" : "opacity-0",
        className
      )}
    />
  );
};

"use client";

interface NavigationLoadingBarProps {
  isLoading: boolean;
  /** Bar color (Tailwind class), default: primary/brand */
  className?: string;
}

export const NavigationLoadingBar = ({
  isLoading,
  className = "bg-primary",
}: NavigationLoadingBarProps) => {
  if (!isLoading) return null;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes navigation-loading-bar {
              from { transform: translateX(-100%); }
              to { transform: translateX(0%); }
            }
          `,
        }}
      />
      <div
        className="fixed left-0 top-0 h-1 w-full opacity-80 overflow-hidden pointer-events-none z-[9999]"
        aria-hidden
      >
        <div
          className={`h-full w-full ${className}`}
          style={{
            animation: "navigation-loading-bar 0.6s ease-out forwards",
          }}
        />
      </div>
    </>
  );
};

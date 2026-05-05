"use client";

import { useAuthLoading } from "../hooks/useAuthLoading";

type LoadingIndicatorProps = {
  fallback?: React.ReactNode;
};

export const LoadingIndicator = ({ fallback }: LoadingIndicatorProps): JSX.Element | null => {
  const { isLoading } = useAuthLoading();

  if (!isLoading) return null;

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/20 z-50">
      <div className="bg-white p-4 rounded-md shadow-lg">
        <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
      </div>
    </div>
  );
};

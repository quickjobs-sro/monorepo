"use client";

import {
  createContext,
  type ReactNode,
  useContext,
} from "react";
import { NavigationLoadingBar } from "./navigation-loading-bar";
import { useNavigationLoading } from "../../hooks/useNavigationLoading";

type NavigationLoadingContextValue = {
  handleNavigationStart: () => void;
};

const NavigationLoadingContext =
  createContext<NavigationLoadingContextValue | null>(null);

export const NavigationLoadingProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { isLoading, handleNavigationStart } = useNavigationLoading();

  return (
    <NavigationLoadingContext.Provider value={{ handleNavigationStart }}>
      <NavigationLoadingBar isLoading={isLoading} />
      {children}
    </NavigationLoadingContext.Provider>
  );
};

export const useNavigationLoadingContext = () => {
  const ctx = useContext(NavigationLoadingContext);
  return ctx;
};

export const useOptionalNavigationLoadingContext = () => {
  return useContext(NavigationLoadingContext);
};

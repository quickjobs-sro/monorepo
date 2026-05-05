import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import API from "quickjobs-api-wrapper";
import { ReactNode } from "react";

export const queryClient = new QueryClient();

export const ServerProvider = ({ children }: { children: ReactNode }) => {
  API.configure({
    url: "https://api.quickjobs.cz/api/",
    // url: "https://api-test.quickjobs.cz/api/",
    // url: "http://localhost:3000/api/",
    //prod
    clientId: "web-app-0BjdRThl0qULR6x2",
    //test
    // clientId: "ios-lkjklsojJKLSF",
    //prod
    secret: "MVgF8m7mM1qNXsQp",
    //test
    // secret: "lkjoniADFAKklda",
    revision: "2.4.0",
    debug: true,
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

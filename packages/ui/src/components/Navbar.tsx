"use client";

import { useQuery } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { LogOut, Menu } from "lucide-react";
import API from "quickjobs-api-wrapper";
import React from "react";
import { useToast } from "../hooks/use-toast";
import { API_KEYS } from "../types/api_keys";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "./core/menubar";
import { UserAvatar } from "./userAvatar";

const LOGO_PATH = "/logo.svg";
export const HEIGHT_NAV_BAR = 72;

type NavbarProps = {
  children: React.ReactNode;
  logo?: string;
  menuItems?: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
  }[];
  onLogoClick?: () => void;
};

export const Navbar = ({
  children,
  logo = LOGO_PATH,
  onLogoClick,
  menuItems,
}: NavbarProps) => {
  const { toast } = useToast();
  const [isMounted, setIsMounted] = React.useState(false);
  const [userToken, setUserToken] = React.useState<string | undefined>(undefined);

  const {
    data: userResponse,
    isLoading: isUserLoading,
    isSuccess,
    isError,
    error,
  } = useQuery({
    queryKey: [API_KEYS.PROFILE],
    queryFn: () => API.users.getProfile(),
    enabled: !!userToken && isMounted,
  });

  React.useEffect(() => {
    setIsMounted(true);
    const token = Cookies.get("QuickJobs.tokens");
    setUserToken(token);
    
    if (token) {
      try {
        const parsedToken = JSON.parse(token);
        API.restoreUserToken(parsedToken);
      } catch (error) {
        console.error("Error parsing userToken as JSON:", error);
      }
    }
  }, []);

  React.useEffect(() => {
    if (
      isMounted &&
      userToken &&
      userResponse?.data &&
      (!userResponse?.data?.givenName ||
        !userResponse?.data?.familyName ||
        !userResponse?.data?.email)
    ) {
      window.location.href = "/?forceRegistration=true";
    }
  }, [isMounted, userToken, userResponse]);

  const data = !isUserLoading && userResponse?.data;

  return (
    <div
      className={`bg-darkblue flex flex-1 flex-row items-center px-4 md:px-6 justify-between`}
      style={{
        height: HEIGHT_NAV_BAR,
      }}
    >
      <button onClick={onLogoClick}>
        <img
          src={logo}
          alt="QuickJOBS Logo"
          className="h-[30px] w-[150px] shrink-0"
        />
      </button>
      <div className="flex items-center gap-2 md:gap-2">
        {children}
        <Menubar className="border-0 p-0 bg-transparent cursor-pointer">
          <MenubarMenu>
            <MenubarTrigger
              disabled={isMounted ? isUserLoading : false}
              color="transparent"
              className="cursor-pointer bg-transparent focus:outline-none focus:bg-transparent disabled:cursor-not-allowed disabled:bg-transparent data-[state=open]:bg-transparent"
            >
              <UserAvatar
                isError={isError}
                isLoading={isMounted ? isUserLoading : true}
                {...data}
              />
              <Menu className="w-8 h-8 text-white" />
            </MenubarTrigger>
            <MenubarContent>
              {menuItems?.map((item) => (
                <MenubarItem
                  key={item.label}
                  onClick={item.onClick}
                  className="text-md"
                >
                  {item.icon}
                  {item.label}
                </MenubarItem>
              ))}

              <MenubarSeparator />
              <MenubarItem
                className="text-md"
                onClick={async () => {
                  try {
                    await API.authorization.logout(true);
                  } catch (error) {
                    console.error("Error during logout:", error);
                    toast({
                      title: "Nastala chyba",
                      description: "Nastala chyba při odhlášení",
                    });
                  }
                  toast({
                    title: "Odhlášení proběhlo úspěšně",
                    description: "Vraťte se prosím na domovskou stránku",
                  });
                  Cookies.remove("QuickJobs.tokens");
                  window.location.reload();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Odhlásit se
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>
    </div>
  );
};

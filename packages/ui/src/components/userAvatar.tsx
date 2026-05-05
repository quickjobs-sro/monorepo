import { AvatarProps } from "@radix-ui/react-avatar";
import { PrivateUserProfile } from "quickjobs-api-wrapper";
import { useEffect, useState } from "react";
import { cn } from "../lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./core/avatar";
import { Skeleton } from "./core/skeleton";

type Props = {
  isLoading?: boolean;
  isError?: boolean;
  showName?: boolean;
  avatarProps?: AvatarProps;
  nameProps?: React.HTMLAttributes<HTMLParagraphElement>;
  wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
} & Partial<PrivateUserProfile>;

export const UserAvatar = ({
  givenName,
  avatarImage,
  isLoading = true,
  isError = false,
  familyName,
  showName = true,
  nameProps,
  avatarProps,
  wrapperProps,
}: Props) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex flex-row gap-2 justify-start items-center w-[200px]">
        <Skeleton className="size-[40px] rounded-full" />
        <Skeleton className="h-[25px] w-[80px]" />
      </div>
    );
  }

  if (isLoading || isError) {
    return (
      <div className="flex flex-row gap-2 justify-start items-center w-[250px]">
        <Skeleton className="size-[40px] rounded-full" />
        <Skeleton className="h-[25px] w-[80px]" />
      </div>
    );
  }

  if (!givenName && !familyName && isError) {
    return (
      <div className="flex flex-row gap-2 justify-start justify-items-start w-[330px] -mt-2">
        <Skeleton className="size-[70px] rounded-full" />
        <p className="text-lg font-medium text-emerald-500 ml-4">
          Uchazeč si již smazal účet
        </p>
      </div>
    );
  }

  return (
    <div
      {...wrapperProps}
      className={cn("flex justify-start items-center gap-2 w-[200px]", wrapperProps?.className)}
      style={{
        width: showName ? 200 : 80,
      }}
    >
      <Avatar {...avatarProps}>
        <AvatarImage
          src={avatarImage?.url}
          alt={`${givenName} ${familyName}`}
        />
        <AvatarFallback>
          {givenName?.[0]}
          {familyName?.[0]}
        </AvatarFallback>
      </Avatar>
      {showName && (
        <p
          {...nameProps}
          className={cn("text-md font-medium text-white", nameProps?.className)}
        >
          {givenName} {familyName}
        </p>
      )}
    </div>
  );
};

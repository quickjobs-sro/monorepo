import * as React from "react";

import { cn } from "../../lib/utils";

type InputProps = React.ComponentProps<"input"> & {
  error?: string;
  notRequired?: boolean;
  wrapperProps?: React.ComponentProps<"div">;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, notRequired, wrapperProps, ...props }, ref) => {
    return (
      <div className="relative" {...wrapperProps}>
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm placeholder:text-gray-400",
            className,
            error && "border-red-500 text-red-500 placeholder:text-red-500"
          )}
          ref={ref}
          {...props}
        />
        {!error && notRequired && (
          <p className="text-gray-400 text-xs absolute -bottom-4 w-[300px]">
            {notRequired ? "nepovinné" : ""}
          </p>
        )}
        {error && (
          <p className="text-red-500 text-xs absolute -bottom-4 w-[300px]">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };

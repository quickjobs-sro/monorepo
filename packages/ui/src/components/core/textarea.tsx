import * as React from "react";

import { cn } from "../../lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea"> & { error?: string }
>(({ className, error, ...props }, ref) => {
  return (
    <div className="relative">
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm placeholder:text-gray-400",
          className,
          error && "border-red-500 text-red-500 placeholder:text-red-500"
        )}
        ref={ref}
        {...props}
      />
      {error && (
        <p className="text-red-500 text-xs absolute -bottom-4 w-[300px]">
          {error}
        </p>
      )}
    </div>
  );
});
Textarea.displayName = "Textarea";

export { Textarea };

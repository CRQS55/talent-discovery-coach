import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[44px] w-full rounded-2xl border border-pink-200/70 bg-white/90 px-4 py-3 text-sm shadow-sm transition-colors placeholder:text-pink-300/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/60 focus-visible:border-pink-300 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };

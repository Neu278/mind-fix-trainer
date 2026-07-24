import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-xs font-bold cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed uppercase font-display tracking-widest [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border border-white bg-black text-white hover:bg-white hover:text-black",
        destructive: "border border-red-500/80 bg-black text-red-400 hover:bg-red-500 hover:text-white",
        outline:
          "border border-white/40 bg-transparent text-white hover:border-white hover:bg-white/10",
        secondary: "border border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 hover:border-neutral-500",
        ghost: "bg-transparent text-white/80 hover:text-white hover:bg-white/10 border border-transparent",
        link: "text-white underline-offset-4 hover:underline border-none p-0 h-auto tracking-normal font-sans text-sm",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-full px-4 text-[11px]",
        lg: "h-13 rounded-full px-8 text-sm",
        icon: "h-10 w-10 p-0 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

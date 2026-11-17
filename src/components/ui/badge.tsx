import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "bg-secondary text-viola",
      accent: "bg-arancione text-viola",
      lilla: "bg-lilla text-viola",
      outline: "border border-violetto/50 text-violetto",
      success: "bg-viola text-white",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-white/10 [.light_&]:bg-black/10", className)} {...props} />;
}

export { Skeleton };


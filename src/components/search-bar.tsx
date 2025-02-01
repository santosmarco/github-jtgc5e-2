import { Search } from "lucide-react";
import * as React from "react";

import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

export interface SearchBarProps
  extends React.ComponentPropsWithoutRef<typeof Input> {
  onSearch?: (value: string) => void;
}

export const SearchBar = React.forwardRef<
  React.ElementRef<typeof Input>,
  SearchBarProps
>(({ className, onSearch, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch?.(e.target.value);
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={ref}
        type="search"
        className={cn(
          "w-full rounded-full border-primary/20 pl-10 shadow-lg transition-shadow duration-300 hover:shadow-xl focus-visible:border-primary/30 focus-visible:ring-primary/20",
          className,
        )}
        onChange={handleChange}
        {...props}
      />
    </div>
  );
});
SearchBar.displayName = "SearchBar";

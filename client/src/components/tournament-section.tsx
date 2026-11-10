import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface TournamentSectionProps<T> {
  id: string;
  title: string;
  description?: string;
  items: readonly T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T) => ReactNode;
  /** Show this many items until the user asks for the rest. */
  initialLimit?: number;
  /** Render the section closed behind a disclosure button. */
  collapsible?: boolean;
  /** Expand collapsed sections and lift the item limit, e.g. while searching. */
  expandAll?: boolean;
  headingLevel?: 2 | 3;
  listClassName?: string;
}

export function TournamentSection<T>({
  id,
  title,
  description,
  items,
  getKey,
  renderItem,
  initialLimit,
  collapsible = false,
  expandAll = false,
  headingLevel = 2,
  listClassName,
}: TournamentSectionProps<T>) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (items.length === 0) return null;

  const titleId = `${id}-title`;
  const limited = initialLimit !== undefined && !showAll && !expandAll && items.length > initialLimit;
  const visibleItems = limited ? items.slice(0, initialLimit) : items;
  const isOpen = !collapsible || open || expandAll;
  const Heading = headingLevel === 3 ? "h3" : "h2";

  const count = (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {items.length}
    </span>
  );

  const list = (
    <div className={cn("space-y-3", listClassName)}>
      {visibleItems.map((item) => (
        <div key={getKey(item)}>{renderItem(item)}</div>
      ))}
    </div>
  );

  const showAllToggle = initialLimit !== undefined && !expandAll && items.length > initialLimit && (
    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowAll((value) => !value)}>
      {showAll ? "Show fewer" : `Show all ${items.length}`}
    </Button>
  );

  return (
    <section id={id} aria-labelledby={titleId} className="scroll-mt-6">
      <Collapsible open={isOpen} onOpenChange={setOpen}>
        <div className="mb-3">
          <Heading className="text-lg font-semibold">
            {collapsible ? (
              <CollapsibleTrigger
                disabled={expandAll}
                className="flex items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", !isOpen && "-rotate-90")}
                  aria-hidden="true"
                />
                <span id={titleId}>{title}</span>
                {count}
              </CollapsibleTrigger>
            ) : (
              <span className="flex items-center gap-2">
                <span id={titleId}>{title}</span>
                {count}
              </span>
            )}
          </Heading>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <CollapsibleContent>
          {list}
          {showAllToggle}
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

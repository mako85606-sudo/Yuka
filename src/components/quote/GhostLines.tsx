import { cn } from "@/lib/cn";

const WIDTHS = [72, 63, 54, 45];

/** Lignes encore illisibles : la place de celles qui n'ont pas encore été lues. */
export function GhostLines({
  count = WIDTHS.length,
  className,
}: {
  readonly count?: number;
  readonly className?: string;
}) {
  return (
    <ul
      aria-hidden
      className={cn("space-y-5 py-5 sm:mr-[calc(var(--margin-col)+1.75rem)]", className)}
    >
      {WIDTHS.slice(0, count).map((width) => (
        <li key={width} className="flex items-center gap-4">
          <span className="h-2 flex-1 rounded-full bg-rule" style={{ maxWidth: `${width}%` }} />
          <span className="ml-auto h-2 w-12 rounded-full bg-rule" />
        </li>
      ))}
    </ul>
  );
}

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
    <ul aria-hidden className={cn("space-y-5 px-5 py-5 sm:px-7", className)}>
      {WIDTHS.slice(0, count).map((width) => (
        <li key={width} className="flex items-center gap-4">
          <span className="h-2.5 flex-1 rounded-sm bg-mist" style={{ maxWidth: `${width}%` }} />
          <span className="ml-auto h-2.5 w-14 rounded-sm bg-mist" />
        </li>
      ))}
    </ul>
  );
}

/** En-tête encore illisible, à la place de celui qui arrive pendant la lecture. */
export function HeaderPlaceholder() {
  return (
    <header aria-hidden className="space-y-3 px-5 pt-6 sm:px-7">
      <span className="block h-2.5 w-32 rounded-sm bg-mist" />
      <span className="block h-4 w-3/4 rounded-sm bg-mist" />
      <span className="block h-2.5 w-44 rounded-sm bg-mist" />
    </header>
  );
}

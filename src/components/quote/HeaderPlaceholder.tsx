/** En-tête encore illisible, à la place de celui qui arrive pendant la lecture. */
export function HeaderPlaceholder() {
  return (
    <header aria-hidden className="border-b border-rule px-5 pb-5 pt-6 sm:px-8 sm:pt-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0 flex-1 space-y-3 pt-1">
          <span className="block h-2 w-28 rounded-[1px] bg-rule" />
          <span className="block h-2 w-44 rounded-[1px] bg-rule" />
          <span className="block h-2 w-36 rounded-[1px] bg-rule" />
        </div>
        <div className="h-36 shrink-0 rounded-[2px] border border-rule sm:h-40 sm:w-[18rem]" />
      </div>
      <span className="mt-6 block h-4 w-3/4 rounded-[1px] bg-rule" />
    </header>
  );
}

import { Tag, type TagTone } from "@/components/ui/Tag";
import { fr } from "@/lib/typography";
import type { SetupItem, SetupState } from "@/server/admin/setup";

const STATE_TAG: Record<SetupState, { readonly tone: TagTone; readonly text: string }> = {
  ok: { tone: "ok", text: "Réglé" },
  missing: { tone: "error", text: "Manque" },
  warning: { tone: "warning", text: "À revoir" },
  optional: { tone: "estimate", text: "Facultatif" },
};

/** État de la configuration : une ligne par réglage, jamais une valeur secrète. */
export function SetupChecklist({ items }: { readonly items: readonly SetupItem[] }) {
  return (
    <ul className="divide-y divide-rule">
      {items.map((item) => (
        <li key={item.id} className="grid gap-x-4 gap-y-1 py-3 sm:grid-cols-[12rem_auto_minmax(0,1fr)] sm:items-baseline">
          <span className="text-sm font-medium text-ink">{fr(item.label)}</span>
          <span>
            <Tag tone={STATE_TAG[item.state].tone}>{STATE_TAG[item.state].text}</Tag>
          </span>
          <span className="break-words text-sm text-ink-muted">{fr(item.detail)}</span>
        </li>
      ))}
    </ul>
  );
}

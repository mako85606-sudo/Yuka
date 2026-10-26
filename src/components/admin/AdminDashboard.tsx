import type { ReactNode } from "react";
import { signOutAdmin } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";
import { CATEGORY_LABELS } from "@/config/taxonomy";
import { cn } from "@/lib/cn";
import type { EventName } from "@/lib/events";
import { formatShortDate } from "@/lib/format";
import { VERDICT_LABELS, type Verdict } from "@/lib/scene-quote";
import { fr } from "@/lib/typography";
import type { SetupItem } from "@/server/admin/setup";
import type { AdminStats } from "@/server/admin/stats";
import { SetupChecklist } from "./SetupChecklist";

const STEP_NAMES: Record<EventName, string> = {
  landing_view: "Vue de la page d'accueil",
  upload_started: "Envoi d'un devis",
  upload_completed: "Devis reçu par le serveur",
  analysis_completed: "Analyse terminée",
  analysis_failed: "Analyse en échec",
  negotiation_copied: "Message copié",
  share_clicked: "Analyse partagée",
  share_page_view: "Page de partage vue",
  detailed_report_clicked: "Rapport détaillé demandé",
  email_submitted: "Email laissé",
};

const PHASE_NAMES: Record<string, string> = {
  idle: "avant l'envoi",
  received: "réception",
  reading: "lecture",
  checking: "contrôles",
  pricing: "prix",
  verdict: "verdict",
};

const VERDICT_BAR: Record<Verdict, string> = {
  ok: "bg-verdict-ok",
  negotiate: "bg-verdict-negotiate",
  alert: "bg-verdict-alert",
};

const VERDICTS: readonly Verdict[] = ["ok", "negotiate", "alert"];

const integer = new Intl.NumberFormat("fr-FR");
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });
const dollars = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

function usd(value: number | null): string {
  return value === null ? "—" : fr(`${dollars.format(value)} $`);
}

function share(part: number, whole: number): string {
  return whole > 0 ? percent.format(part / whole) : "—";
}

/** Une carte du tableau de bord : un titre, une note facultative, le contenu. */
function Section({
  title,
  children,
  note,
  className,
}: {
  readonly title: string;
  readonly note?: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <section className={cn("rounded-lg bg-paper-raised p-6 elevation-1 sm:p-7", className)}>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {note ? <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-muted">{note}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Un chiffre clé : son intitulé, la valeur en grand, un détail. */
function Tile({ label, value, detail }: { readonly label: string; readonly value: string; readonly detail?: string }) {
  return (
    <div className="rounded-lg bg-paper-raised p-5 elevation-1">
      <p className="text-sm font-medium text-ink-muted">{label}</p>
      <p className="mt-3 whitespace-nowrap font-mono text-2xl font-semibold leading-none tabular-nums text-ink sm:text-[1.75rem]">
        {value}
      </p>
      {detail ? <p className="mt-2.5 text-sm text-ink-muted">{detail}</p> : null}
    </div>
  );
}

/** Barre horizontale à une seule teinte ; la valeur est toujours écrite à côté. */
function Bar({ ratio }: { readonly ratio: number }) {
  return (
    <span aria-hidden className="block h-2 w-full overflow-hidden rounded-sm bg-mist">
      <span className="block h-2 rounded-sm bg-brand" style={{ width: `${Math.round(Math.min(1, ratio) * 100)}%` }} />
    </span>
  );
}

function Table({ head, children }: { readonly head: readonly string[]; readonly children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule text-left">
            {head.map((cell, index) => (
              <th
                key={cell}
                scope="col"
                className={cn("pb-3 text-[0.8125rem] font-medium text-ink-muted", index > 0 && "text-right")}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">{children}</tbody>
      </table>
    </div>
  );
}

const cellNumber = "py-2.5 text-right font-mono tabular-nums text-ink";
const cellLabel = "py-2.5 pr-4 text-left font-normal text-ink";

/** Analyses par jour : une colonne par jour, la plus haute vaut le maximum de la période. */
function DailyChart({ days }: { readonly days: AdminStats["days"] }) {
  const max = Math.max(1, ...days.map((entry) => entry.count));
  const first = days[0];
  const last = days.at(-1);
  return (
    <figure>
      <div aria-hidden className="flex h-40 items-end gap-[3px] border-b border-rule">
        {days.map((entry) => (
          <span
            key={entry.day}
            title={`${entry.day} : ${entry.count}`}
            className="block min-w-0 flex-1 rounded-t-sm bg-brand"
            style={{ height: `${(entry.count / max) * 100}%` }}
          />
        ))}
      </div>
      <figcaption aria-hidden className="mt-2 flex justify-between gap-4 font-mono text-xs tabular-nums text-ink-muted">
        <span>{first ? formatShortDate(new Date(`${first.day}T12:00:00Z`)) : null}</span>
        <span>{fr(`max : ${integer.format(max)} par jour`)}</span>
        <span>{last ? formatShortDate(new Date(`${last.day}T12:00:00Z`)) : null}</span>
      </figcaption>
      <details className="mt-5 text-sm">
        <summary className="w-fit cursor-pointer font-medium text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink">
          Voir le tableau jour par jour
        </summary>
        <div className="mt-4">
          <Table head={["Jour", "Analyses"]}>
            {days.map((entry) => (
              <tr key={entry.day}>
                <td className="py-2.5 text-ink">{formatShortDate(new Date(`${entry.day}T12:00:00Z`))}</td>
                <td className={cellNumber}>{integer.format(entry.count)}</td>
              </tr>
            ))}
          </Table>
        </div>
      </details>
    </figure>
  );
}

/** Répartition des verdicts : une barre segmentée, chaque segment nommé et chiffré dessous. */
function VerdictSplit({ verdicts, total }: { readonly verdicts: AdminStats["verdicts"]; readonly total: number }) {
  return (
    <div>
      <div aria-hidden className="flex h-3 gap-[3px] overflow-hidden rounded-sm bg-mist">
        {total > 0
          ? VERDICTS.map((verdict) =>
              verdicts[verdict] > 0 ? (
                <span key={verdict} className={VERDICT_BAR[verdict]} style={{ width: `${(verdicts[verdict] / total) * 100}%` }} />
              ) : null,
            )
          : null}
      </div>
      <ul className="mt-5 space-y-2.5 text-sm text-ink">
        {VERDICTS.map((verdict) => (
          <li key={verdict} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2.5">
              <span aria-hidden className={cn("inline-block size-2.5 rounded-full", VERDICT_BAR[verdict])} />
              {VERDICT_LABELS[verdict]}
            </span>
            <span className="font-mono tabular-nums">
              {integer.format(verdicts[verdict])}{" "}
              <span className="text-ink-muted">({share(verdicts[verdict], total)})</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Une ligne de chiffres : l'intitulé à gauche, la valeur à droite. */
function Figure({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-mono tabular-nums text-ink">{value}</dd>
    </div>
  );
}

export function AdminDashboard({ stats, setup }: { readonly stats: AdminStats; readonly setup: readonly SetupItem[] }) {
  const signupTotal = Object.values(stats.signups).reduce((sum, value) => sum + value, 0);
  const firstStep = stats.funnel[0]?.visits ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-2">
        <div>
          <p className="text-sm font-semibold text-brand-strong">Administration</p>
          <h1 className="mt-2 font-display text-title text-ink">Tableau de bord</h1>
          <p className="mt-2 text-sm text-ink-muted">
            {fr(`Depuis le ${formatShortDate(stats.since)} (30 jours, durée de vie d'une analyse), heure de Paris.`)}
          </p>
        </div>
        <form action={signOutAdmin}>
          <Button type="submit" variant="secondary" size="sm">
            Se déconnecter
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Analyses" value={integer.format(stats.total)} />
        <Tile label="Coût LLM moyen" value={usd(stats.cost.average)} detail={fr(`par analyse · total ${usd(stats.cost.total)}`)} />
        <Tile label="Partages" value={integer.format(stats.shares)} detail={`${share(stats.shares, stats.total)} des analyses`} />
        <Tile
          label="Emails"
          value={integer.format(signupTotal)}
          detail={fr(
            `accueil : ${integer.format(stats.signups.landing ?? 0)} · rapport : ${integer.format(stats.signups.detailed_report ?? 0)}`,
          )}
        />
      </div>

      <Section title="Configuration" note="Ce qui est réglé sur ce serveur. Aucune valeur secrète n'est affichée.">
        <SetupChecklist items={setup} />
      </Section>

      <Section title="Analyses par jour">
        <DailyChart days={stats.days} />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Verdicts">
          <VerdictSplit verdicts={stats.verdicts} total={stats.total} />
        </Section>

        <Section title="Coût du modèle" note="Lecture et estimation des prix comprises, d'après les tarifs de src/config/llm.ts.">
          <dl className="-my-2.5 divide-y divide-rule text-sm">
            <Figure
              label="Dépense du jour"
              value={fr(`${usd(stats.cost.today)} sur ${usd(stats.cost.dailyBudget)}`)}
            />
            <Figure label="Toutes dépenses de la période" value={usd(stats.cost.periodSpend)} />
            <Figure label="Analyses enregistrées : total" value={usd(stats.cost.total)} />
            <Figure label="Moyenne par analyse" value={usd(stats.cost.average)} />
            <Figure
              label="Tokens en entrée (moyenne)"
              value={stats.cost.averageInputTokens === null ? "—" : integer.format(Math.round(stats.cost.averageInputTokens))}
            />
            <Figure
              label="Tokens en sortie (moyenne)"
              value={stats.cost.averageOutputTokens === null ? "—" : integer.format(Math.round(stats.cost.averageOutputTokens))}
            />
          </dl>
        </Section>
      </div>

      <Section
        title="Conversion par étape"
        note={fr(
          "Visites distinctes ayant atteint chaque étape. Une visite dure le temps de la navigation : un rechargement en ouvre une nouvelle.",
        )}
      >
        <Table head={["Étape", "Visites", "vs étape précédente", "vs départ", ""]}>
          {stats.funnel.map((step, index) => {
            const previous = index > 0 ? (stats.funnel[index - 1]?.visits ?? 0) : step.visits;
            return (
              <tr key={step.name}>
                <th scope="row" className={cellLabel}>
                  {STEP_NAMES[step.name]}
                </th>
                <td className={cellNumber}>{integer.format(step.visits)}</td>
                <td className={cellNumber}>{index > 0 ? share(step.visits, previous) : "—"}</td>
                <td className={cellNumber}>{share(step.visits, firstStep)}</td>
                <td className="w-32 py-2.5 pl-4">
                  <Bar ratio={firstStep > 0 ? step.visits / firstStep : 0} />
                </td>
              </tr>
            );
          })}
        </Table>
      </Section>

      <Section title="Catégories">
        {stats.categories.length > 0 ? (
          <Table head={["Catégorie", "Analyses", ...VERDICTS.map((verdict) => VERDICT_LABELS[verdict])]}>
            {stats.categories.map((entry) => (
              <tr key={entry.category}>
                <th scope="row" className={cellLabel}>
                  {CATEGORY_LABELS[entry.category] ?? entry.category}
                </th>
                <td className={cellNumber}>{integer.format(entry.total)}</td>
                {VERDICTS.map((verdict) => (
                  <td key={verdict} className={cellNumber}>
                    {integer.format(entry.verdicts[verdict])}
                  </td>
                ))}
              </tr>
            ))}
          </Table>
        ) : (
          <p className="text-sm text-ink-muted">Aucune analyse sur la période.</p>
        )}
      </Section>

      <Section title="Analyses en échec, par étape">
        {stats.failures.length > 0 ? (
          <Table head={["Étape atteinte", "Motif", "Nombre"]}>
            {stats.failures.map((failure) => (
              <tr key={`${failure.step}-${failure.code}`}>
                <th scope="row" className={cellLabel}>
                  {PHASE_NAMES[failure.step] ?? failure.step}
                </th>
                <td className="py-2.5 text-right font-mono text-ink">{failure.code}</td>
                <td className={cellNumber}>{integer.format(failure.count)}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="text-sm text-ink-muted">Aucun échec sur la période.</p>
        )}
      </Section>
    </div>
  );
}

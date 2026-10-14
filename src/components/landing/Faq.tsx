import { cn } from "@/lib/cn";
import { fr } from "@/lib/typography";

interface Question {
  readonly question: string;
  readonly answer: string;
}

const QUESTIONS: readonly Question[] = [
  {
    question: "C'est vraiment gratuit ?",
    answer:
      "Oui. Pas de compte à créer, pas de carte bancaire à donner. On limite seulement à cinq analyses par jour et par personne, sinon la facture d'IA nous ruinerait.",
  },
  {
    question: "Que devient la photo de mon devis ?",
    answer:
      "Elle est lue puis effacée dans la foulée, sans jamais être enregistrée. Les noms, adresses et numéros de téléphone ne sont même pas recopiés. Ce qu'on garde ressemble à ça : « chauffe-eau 200 L, 890 € HT », avec la catégorie et le département. Rien qui permette de savoir qui tu es, ni qui est l'artisan.",
  },
  {
    question: "D'où viennent les prix de comparaison ?",
    answer:
      "Des devis déjà passés par Loupe, une fois rendus anonymes : même prestation, même région, moins de deux ans. Il en faut au moins cinq pour parler de médiane. Sinon, l'IA propose une fourchette, affichée avec la mention « confiance faible » pour que tu la prennes avec des pincettes.",
  },
  {
    question: "Quels devis peut-on analyser ?",
    answer:
      "Ceux du garagiste, du plombier, de l'électricien, du chauffagiste, du serrurier et du déménageur, plus les petits travaux. Les devis de dentiste, d'opticien ou d'audioprothésiste attendront : la santé a ses propres règles, et on préfère ne pas improviser.",
  },
  {
    question: "Et si Loupe se trompe ?",
    answer:
      "Ça arrive, surtout sur une photo prise de travers. C'est pour ça que chaque remarque indique si elle est vérifiée (un calcul, une mention) ou estimée (un prix), et d'où elle vient. Garde ton devis papier à côté et relis avant d'envoyer quoi que ce soit.",
  },
  {
    question: "L'artisan saura-t-il que j'ai utilisé Loupe ?",
    answer:
      "Seulement si tu le lui dis. Le message est écrit en ton nom, sur un ton courtois, et le verdict ne quitte pas ton écran.",
  },
  {
    question: "Loupe remplace-t-il un professionnel ?",
    answer:
      "Non. Loupe donne un avis indicatif, pas un conseil juridique. Si ça tourne au litige, une association de consommateurs ou un professionnel du droit t'aidera bien mieux.",
  },
];

/**
 * Questions fréquentes, en accordéons natifs (accessibles sans JavaScript).
 * `ruled` : posées sur une copie à carreaux, sans traits de séparation.
 */
export function Faq({ ruled = false, className }: { readonly ruled?: boolean; readonly className?: string } = {}) {
  return (
    <div className={cn(!ruled && "divide-y divide-rule border-y border-rule", className)}>
      {QUESTIONS.map(({ question, answer }) => (
        <details key={question} className="group">
          <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 py-5 text-[1.0625rem] font-medium text-ink [&::-webkit-details-marker]:hidden">
            {fr(question)}
            <span
              aria-hidden
              className="font-mono text-xl leading-none text-pen-red-strong group-open:rotate-45 motion-safe:transition-transform motion-safe:duration-(--duration-micro)"
            >
              +
            </span>
          </summary>
          <p className="max-w-prose pb-6 leading-relaxed text-ink-muted">{fr(answer)}</p>
        </details>
      ))}
    </div>
  );
}

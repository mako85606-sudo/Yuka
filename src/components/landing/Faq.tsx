import { fr } from "@/lib/typography";

interface Question {
  readonly question: string;
  readonly answer: string;
}

const QUESTIONS: readonly Question[] = [
  {
    question: "C'est vraiment gratuit ?",
    answer:
      "Oui. L'analyse est gratuite, sans compte et sans carte bancaire. Pour éviter les abus, on limite à cinq analyses par jour.",
  },
  {
    question: "Que devient la photo de mon devis ?",
    answer:
      "Elle est lue en mémoire, puis effacée. On ne garde ni la photo, ni le PDF, ni les noms, adresses ou numéros. Seulement des lignes anonymes (« chauffe-eau 200 L, 890 € HT »), la catégorie et le département, pour comparer les prix.",
  },
  {
    question: "D'où viennent les prix de comparaison ?",
    answer:
      "De devis déjà analysés par Loupe, anonymisés : même prestation, région proche, moins de 24 mois. Quand on en a moins de cinq, on te donne une estimation IA, présentée comme telle, avec une confiance faible.",
  },
  {
    question: "Quels devis peut-on analyser ?",
    answer:
      "Garage, plomberie, électricité, chauffage, serrurerie, travaux et déménagement. Pas encore les devis de santé (dentaire, optique, audition) : ceux-là, on préfère ne pas s'y risquer pour l'instant.",
  },
  {
    question: "Et si Loupe se trompe ?",
    answer:
      "Ça peut arriver : lire une photo n'est jamais parfait. Chaque point dit s'il est vérifié (un calcul, une mention) ou estimé (un prix), avec sa source. Relis avant d'envoyer quoi que ce soit.",
  },
  {
    question: "L'artisan saura-t-il que j'ai utilisé Loupe ?",
    answer:
      "Non, sauf si tu le lui dis. Le message de négociation est le tien : poli, factuel, sans accusation. Le verdict reste privé.",
  },
  {
    question: "Loupe remplace-t-il un professionnel ?",
    answer:
      "Non. C'est un avis indicatif, pas un conseil juridique. En cas de litige, adresse-toi à un professionnel ou à une association de consommateurs.",
  },
];

/** Questions fréquentes, en accordéons natifs (accessibles sans JavaScript). */
export function Faq() {
  return (
    <div className="divide-y divide-rule border-y border-rule">
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

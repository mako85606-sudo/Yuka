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
      "Oui. Pas de compte à créer, pas de carte bancaire. Nous limitons seulement l'usage à cinq analyses par jour et par personne, pour garder le service gratuit.",
  },
  {
    question: "Que devient la photo de mon devis ?",
    answer:
      "Elle est lue puis effacée aussitôt, sans jamais être enregistrée. Les noms, adresses et numéros de téléphone ne sont même pas recopiés. Nous gardons seulement des lignes anonymes, du type « chauffe-eau 200 L, 890 € HT », avec la catégorie et le département : rien qui permette de savoir qui vous êtes, ni qui est l'artisan.",
  },
  {
    question: "D'où viennent les prix de comparaison ?",
    answer:
      "Des devis déjà analysés par Loupe, une fois rendus anonymes : même prestation, même région, moins de deux ans. Il en faut au moins cinq pour parler de médiane. Sinon, l'IA propose une fourchette, toujours signalée comme une estimation à confiance faible.",
  },
  {
    question: "Quels devis peut-on analyser ?",
    answer:
      "Ceux du garagiste, du plombier, de l'électricien, du chauffagiste, du serrurier et du déménageur, ainsi que les petits travaux. Les devis de santé (dentiste, opticien, audioprothésiste) ne sont pas encore pris en charge.",
  },
  {
    question: "Et si Loupe se trompe ?",
    answer:
      "Cela peut arriver, surtout sur une photo prise de travers. C'est pourquoi chaque remarque indique si elle est vérifiée (un calcul, une mention) ou estimée (un prix), et d'où elle vient. Gardez votre devis sous les yeux et relisez avant d'envoyer quoi que ce soit.",
  },
  {
    question: "L'artisan saura-t-il que j'ai utilisé Loupe ?",
    answer:
      "Seulement si vous le lui dites. Le message est rédigé en votre nom, sur un ton courtois, et le verdict reste sur votre écran.",
  },
  {
    question: "Loupe remplace-t-il un professionnel ?",
    answer:
      "Non. Loupe donne un avis indicatif, pas un conseil juridique. En cas de litige, une association de consommateurs ou un professionnel du droit vous aidera bien mieux.",
  },
];

/** Questions fréquentes, en accordéons natifs (accessibles sans JavaScript), séparées par un filet. */
export function Faq({ className }: { readonly className?: string } = {}) {
  return (
    <div className={cn("divide-y divide-rule", className)}>
      {QUESTIONS.map(({ question, answer }) => (
        <details key={question} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[1.0625rem] font-medium text-ink [&::-webkit-details-marker]:hidden">
            {fr(question)}
            <span
              aria-hidden
              className="grid size-7 shrink-0 place-items-center rounded-sm bg-mist text-lg leading-none text-brand-strong group-open:rotate-45 motion-safe:transition-transform motion-safe:duration-(--duration-micro)"
            >
              +
            </span>
          </summary>
          <p className="max-w-prose pb-6 pr-12 leading-relaxed text-ink-muted">{fr(answer)}</p>
        </details>
      ))}
    </div>
  );
}

import { PageHeader } from "@/components/app/PageHeader";
import { GameCard } from "./GameCard";

const games = [
  {
    title: "Följa John Remix",
    description: "Snabb uppvärmning med varierade rörelser. Passar både inne och ute.",
    tags: ["Energifylld", "Inne/ute", "6-12 år"],
    duration: "10 min",
    groupSize: "8-20",
  },
  {
    title: "Stafettbygget",
    description: "Lagvis stafett där deltagarna hämtar och bygger ihop en form.",
    tags: ["Samarbete", "Ute", "10-16 år"],
    duration: "15 min",
    groupSize: "10-30",
  },
  {
    title: "Kull med twist",
    description: "Klassisk kull med stationer som ger power-ups och avlastning.",
    tags: ["Rörelse", "Snabbt", "7-14 år"],
    duration: "12 min",
    groupSize: "10-24",
  },
];

const filters = ["Alla", "Inne", "Ute", "Snabbt", "Lugnare", "Samarbete"];

export function BrowsePage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Upptäck lekar" />
      <div className="px-4 pb-6 lg:px-8">
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 text-sm">
          {filters.map((chip) => (
            <button
              key={chip}
              className="whitespace-nowrap rounded-full border border-border bg-muted px-3 py-1 text-muted-foreground hover:text-foreground"
            >
              {chip}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => (
            <GameCard key={game.title} {...game} />
          ))}
        </div>
      </div>
    </div>
  );
}

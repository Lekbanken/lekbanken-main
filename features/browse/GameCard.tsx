type GameCardProps = {
  title: string;
  description: string;
  tags: string[];
  duration: string;
  groupSize: string;
};

export function GameCard({ title, description, tags, duration, groupSize }: GameCardProps) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{description}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{duration}</span>
      </header>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {tags.map((tag) => (
          <span key={tag} className="rounded-full bg-muted px-2 py-1">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-3 text-xs font-medium text-muted-foreground">Grupp: {groupSize}</div>
    </article>
  );
}

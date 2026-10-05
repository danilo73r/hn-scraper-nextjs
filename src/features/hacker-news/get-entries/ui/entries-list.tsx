import type { Entry } from "../entry";

export function EntriesList({ entries }: { entries: readonly Entry[] }) {
  if (entries.length === 0)
    return (
      <p className="empty-stories text-center text-muted">
        No stories to show yet.
      </p>
    );

  return (
    <ol className="m-0 list-none p-0" aria-label="Stories">
      {entries.map((entry) => (
        <li key={entry.rank} className="story-row grid items-baseline">
          <span
            className="story-rank font-mono"
            aria-label={`Rank ${entry.rank}`}
          >
            {entry.rank}
          </span>
          <h3 className="story-title text-base">{entry.title}</h3>
          <div className="story-metrics flex text-xs text-muted">
            <span>{entry.points} points</span>
            <span>{entry.comments} comments</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

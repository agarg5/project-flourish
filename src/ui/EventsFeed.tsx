import { useGame } from '../state/store';

export function EventsFeed() {
  const events = useGame((g) => g.snap.events);
  const recent = events.slice(-6).reverse();
  if (recent.length === 0) return null;

  return (
    <div className="panel eventsfeed">
      {recent.map((e, i) => (
        <div
          key={`${e.tick}-${i}`}
          className={`ev ${i > 2 ? 'old' : ''} ${e.type === 'arrival' || e.type === 'ageUp' ? 'highlight' : ''}`}
        >
          {e.type === 'arrival' ? '✨ ' : ''}{e.message}
        </div>
      ))}
    </div>
  );
}

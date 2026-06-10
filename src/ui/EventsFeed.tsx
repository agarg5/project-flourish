import { useGame } from '../state/store';

export function EventsFeed() {
  const events = useGame((g) => g.snap.events);
  const recent = events.slice(-6).reverse();
  if (recent.length === 0) return null;

  return (
    <div className="panel eventsfeed">
      {recent.map((e, i) => (
        <div key={`${e.tick}-${i}`} className={i > 2 ? 'ev old' : 'ev'}>
          {e.message}
        </div>
      ))}
    </div>
  );
}

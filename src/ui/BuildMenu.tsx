import { useGame } from '../state/store';

// Build + stewardship menu (doc 06 M3). Selecting an item enters placement
// mode: valid cells highlight, click places, right-click/Esc cancels.
export function BuildMenu() {
  const placeables = useGame((g) => g.snap.placeables);
  const placing = useGame((g) => g.placing);
  const setPlacing = useGame((g) => g.setPlacing);

  return (
    <div className="panel buildmenu">
      <h4>Build &amp; Steward</h4>
      <div className="items">
        {placeables.map((p) => {
          const selected = placing?.id === p.id;
          return (
            <button
              key={p.id}
              className={`item ${selected ? 'selected' : ''} ${p.kind}`}
              disabled={!p.affordable && !selected}
              title={p.description}
              onClick={() => setPlacing(selected ? null : { kind: p.kind, id: p.id })}
            >
              <span className="name">{p.name}</span>
              <span className="cost">🪙{p.cost}</span>
            </button>
          );
        })}
      </div>
      {placing && <div className="hint">Click a highlighted tile · right-click or Esc to cancel</div>}
    </div>
  );
}

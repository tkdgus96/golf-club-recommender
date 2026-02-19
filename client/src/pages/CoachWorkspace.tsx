import { useMemo, useState } from "react";
import { useProfile } from "../contexts/ProfileContext";

interface CoachPlayer {
  id: string;
  name: string;
  email: string;
  handicap: string;
  notes: string;
  beforeBagId: string;
  afterBagId: string;
}

const STORAGE_KEY = "golf-coach-workspace-v1";

function loadPlayers(): CoachPlayer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CoachPlayer[];
  } catch {
    return [];
  }
}

function savePlayers(players: CoachPlayer[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

export default function CoachWorkspace() {
  const { savedBags } = useProfile();
  const [players, setPlayers] = useState<CoachPlayer[]>(() => loadPlayers());
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(players[0]?.id || "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [handicap, setHandicap] = useState("");

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) || null;

  const beforeBag = useMemo(
    () => savedBags.find((bag) => bag.id === selectedPlayer?.beforeBagId) || null,
    [savedBags, selectedPlayer?.beforeBagId]
  );

  const afterBag = useMemo(
    () => savedBags.find((bag) => bag.id === selectedPlayer?.afterBagId) || null,
    [savedBags, selectedPlayer?.afterBagId]
  );

  const addPlayer = () => {
    if (!name.trim()) return;

    const player: CoachPlayer = {
      id: `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      email: email.trim(),
      handicap: handicap.trim(),
      notes: "",
      beforeBagId: "",
      afterBagId: "",
    };

    const next = [player, ...players];
    setPlayers(next);
    setSelectedPlayerId(player.id);
    savePlayers(next);
    setName("");
    setEmail("");
    setHandicap("");
  };

  const updatePlayer = (id: string, patch: Partial<CoachPlayer>) => {
    const next = players.map((player) =>
      player.id === id ? { ...player, ...patch } : player
    );
    setPlayers(next);
    savePlayers(next);
  };

  const removePlayer = (id: string) => {
    const next = players.filter((player) => player.id !== id);
    setPlayers(next);
    savePlayers(next);
    if (selectedPlayerId === id) {
      setSelectedPlayerId(next[0]?.id || "");
    }
  };

  const priceDelta =
    beforeBag && afterBag
      ? Number(afterBag.results.totalPrice) - Number(beforeBag.results.totalPrice)
      : null;

  const confidenceDelta = beforeBag && afterBag
    ? (() => {
        const getAvg = (bagId: string) => {
          const bag = savedBags.find((candidate) => candidate.id === bagId);
          if (!bag) return 0;
          const parts = [
            bag.results.driver,
            bag.results.fairwayWood,
            bag.results.hybrid,
            bag.results.ironSet,
            bag.results.wedge,
            bag.results.putter,
          ].filter(Boolean);

          if (parts.length === 0) return 0;
          return parts.reduce((sum, item) => sum + Number(item?.confidence.score || 0), 0) / parts.length;
        };

        return getAvg(afterBag.id) - getAvg(beforeBag.id);
      })()
    : null;

  return (
    <div className="coach-page">
      <div className="catalog-header">
        <h1>Coach Workspace</h1>
        <p>Multi-player fitting dashboard with notes and before/after bag comparisons.</p>
      </div>

      <div className="coach-layout">
        <aside className="filters-sidebar">
          <h3>Players</h3>

          <div className="quiz-options">
            <input
              className="dropdown-search"
              placeholder="Player Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="dropdown-search"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="dropdown-search"
              placeholder="Handicap"
              value={handicap}
              onChange={(e) => setHandicap(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" onClick={addPlayer}>
              Add Player
            </button>
          </div>

          <div className="my-fits-list">
            {players.map((player) => (
              <button
                key={player.id}
                className={`quiz-option ${selectedPlayerId === player.id ? "selected" : ""}`}
                onClick={() => setSelectedPlayerId(player.id)}
              >
                <strong>{player.name}</strong>
                <span>{player.email || "No email"}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="chart-area coach-main">
          {!selectedPlayer ? (
            <div className="empty-state">
              <h3>Select a player</h3>
              <p>Add or select a player to manage fitting notes and outcomes.</p>
            </div>
          ) : (
            <div className="coach-card">
              <div className="coach-header-row">
                <h3>{selectedPlayer.name}</h3>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => removePlayer(selectedPlayer.id)}
                >
                  Remove Player
                </button>
              </div>

              <div className="coach-fields">
                <label>
                  Handicap
                  <input
                    className="dropdown-search"
                    value={selectedPlayer.handicap}
                    onChange={(e) =>
                      updatePlayer(selectedPlayer.id, { handicap: e.target.value })
                    }
                  />
                </label>

                <label>
                  Before Bag
                  <select
                    value={selectedPlayer.beforeBagId}
                    onChange={(e) =>
                      updatePlayer(selectedPlayer.id, { beforeBagId: e.target.value })
                    }
                    className="dropdown-vendor"
                  >
                    <option value="">Select</option>
                    {savedBags.map((bag) => (
                      <option key={bag.id} value={bag.id}>
                        {bag.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  After Bag
                  <select
                    value={selectedPlayer.afterBagId}
                    onChange={(e) =>
                      updatePlayer(selectedPlayer.id, { afterBagId: e.target.value })
                    }
                    className="dropdown-vendor"
                  >
                    <option value="">Select</option>
                    {savedBags.map((bag) => (
                      <option key={bag.id} value={bag.id}>
                        {bag.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Notes
                  <textarea
                    className="dropdown-search"
                    value={selectedPlayer.notes}
                    rows={5}
                    onChange={(e) => updatePlayer(selectedPlayer.id, { notes: e.target.value })}
                  />
                </label>
              </div>

              {(beforeBag || afterBag) && (
                <div className="coach-comparison">
                  <h4>Before vs After</h4>
                  <div className="bundle-offer-list">
                    <div className="bundle-offer-item">
                      <strong>Before</strong>
                      <span>{beforeBag ? `$${beforeBag.results.totalPrice.toFixed(2)}` : "-"}</span>
                    </div>
                    <div className="bundle-offer-item">
                      <strong>After</strong>
                      <span>{afterBag ? `$${afterBag.results.totalPrice.toFixed(2)}` : "-"}</span>
                    </div>
                    <div className="bundle-offer-item">
                      <strong>Price Delta</strong>
                      <span>
                        {priceDelta === null
                          ? "-"
                          : `${priceDelta > 0 ? "+" : ""}$${priceDelta.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="bundle-offer-item">
                      <strong>Confidence Delta</strong>
                      <span>
                        {confidenceDelta === null
                          ? "-"
                          : `${confidenceDelta > 0 ? "+" : ""}${Math.round(confidenceDelta * 100)}%`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="coach-actions">
                <button className="btn btn-primary" onClick={() => window.print()}>
                  Export Branded PDF
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

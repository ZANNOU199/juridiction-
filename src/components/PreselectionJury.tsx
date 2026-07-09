import React, { useEffect, useState } from "react";

export function PreselectionJury({
  eventSlug,
  participants,
  juryId,
}: {
  eventSlug?: string;
  participants: any[];
  juryId: string | null;
}) {
  const [criteria, setCriteria] = useState<Array<{ name: string; maxScore: string }>>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      if (!eventSlug) return;
      try {
        const [cRes, mRes] = await Promise.all([
          fetch(`/api/preselection/${eventSlug}`),
          fetch(`/api/preselection/${eventSlug}/current`),
        ]);
        if (!cRes.ok) throw new Error("Failed to load criteria");
        if (!mRes.ok) throw new Error("Failed to load current index");
        const cJson = await cRes.json();
        const mJson = await mRes.json();
        if (!mounted) return;
        setCriteria(Array.isArray(cJson.criteria) ? cJson.criteria : []);
        setCurrentIndex(typeof mJson.currentIndex === "number" ? mJson.currentIndex : 0);
      } catch (e: any) {
        console.error(e);
        if (!mounted) return;
        setError(e.message || "Failed to load preselection data");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    fetchData();

    const interval = setInterval(fetchData, 2000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [eventSlug]);

  useEffect(() => {
    // Reset scores when criteria or index change
    const initial: Record<string, number> = {};
    criteria.forEach((c, i) => {
      initial[String(i)] = 0;
    });
    setScores(initial);
    setLocked(false);
  }, [criteria, currentIndex]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-400">{error}</div>;

  const participant = participants[currentIndex] || { id: `p-${currentIndex + 1}`, name: "Participant inconnu" };

  const updateScore = (idx: number, value: number) => {
    setScores((s) => ({ ...s, [String(idx)]: value }));
  };

  const handleSubmit = async () => {
    if (!eventSlug || !juryId) return;
    setLocked(true);
    const payload = {
      entry: {
        participantId: participant.id,
        juryId,
        scores: criteria.map((c, i) => ({ name: c.name, maxScore: c.maxScore, score: Number(scores[String(i)] || 0) })),
        timestamp: Date.now(),
      },
    };

    try {
      const res = await fetch(`/api/preselection/${eventSlug}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores: payload }),
      });
      if (!res.ok) {
        throw new Error(`Server error ${res.status}`);
      }
    } catch (e) {
      console.error(e);
      setError("Échec de l'envoi");
      setLocked(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-dark text-white">
      <div className="max-w-2xl w-full bg-white/5 border border-white/10 p-6">
        <h2 className="text-xl font-black mb-2">Préselection — {participant.name}</h2>
        <p className="text-sm text-white/40 mb-4">Notation par critères</p>

        <div className="space-y-3">
          {criteria.length === 0 && <div className="text-white/40">Aucun critère défini</div>}
          {criteria.map((c, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-sm font-bold">{c.name}</div>
                <div className="text-[11px] text-white/40">Max: {c.maxScore}</div>
              </div>
              <div className="w-32">
                <input
                  type="number"
                  min={0}
                  max={Number(c.maxScore || 10)}
                  value={scores[String(i)]}
                  onChange={(e) => updateScore(i, Math.max(0, Math.min(Number(c.maxScore || 10), Number(e.target.value || 0))))}
                  disabled={locked}
                  className="w-full bg-black/40 border border-white/10 px-3 py-2 text-black font-bold"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-white/40">Index: {currentIndex + 1}</div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={locked}
              className="px-4 py-2 bg-white text-black font-black uppercase"
            >
              Envoyer
            </button>
            {locked && <div className="text-sm text-white/40">Envoyé</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

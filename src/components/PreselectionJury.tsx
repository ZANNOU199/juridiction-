import React, { useEffect, useState } from "react";

export function PreselectionJury({
  eventSlug,
  participants,
  juryId,
  category,
}: {
  eventSlug?: string;
  participants: any[];
  juryId: string | null;
  category?: string;
}) {
  const [criteria, setCriteria] = useState<Array<{ name: string; maxScore: string }>>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasEdited, setHasEdited] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | null } | null>(null);

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
    // Reset scores when criteria or index change only if user hasn't edited yet and hasn't submitted
    if (hasEdited || submitted) return;
    const initial: Record<string, number> = {};
    criteria.forEach((c, i) => {
      initial[String(i)] = 0;
    });
    setScores(initial);
    setLocked(false);
  }, [criteria, currentIndex, hasEdited, submitted]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-400">{error}</div>;

  const participant = participants[currentIndex] || { id: `p-${currentIndex + 1}`, name: "Participant inconnu" };

  const updateScore = (idx: number, value: number) => {
    setScores((s) => ({ ...s, [String(idx)]: value }));
    setHasEdited(true);
    // clear field error for this index when user edits
    setFieldErrors((fe) => {
      const copy = { ...fe };
      delete copy[String(idx)];
      return copy;
    });
    // immediate validation: cap value to max
    const max = Number(criteria[idx]?.maxScore || 0);
    if (max > 0 && value > max) {
      setFieldErrors((fe) => ({ ...fe, [String(idx)]: `Ne peut pas dépasser ${max}` }));
    }
  };

  const handleSubmit = async () => {
    if (!eventSlug || !juryId) return;
    // Validate: all criteria must be filled and at least 1
    const newFieldErrors: Record<string, string> = {};
    let anyPositive = false;
    for (let i = 0; i < criteria.length; i++) {
      const valRaw = scores[String(i)];
      const val = Number.isFinite(Number(valRaw)) ? Number(valRaw) : NaN;
      if (Number.isNaN(val)) {
        newFieldErrors[String(i)] = "Remplissez cette case";
      } else if (val < 1) {
        newFieldErrors[String(i)] = "La note doit être ≥ 1";
      } else {
        anyPositive = true;
      }
      const max = Number(criteria[i]?.maxScore || 0);
      if (max > 0 && !Number.isNaN(val) && val > max) {
        newFieldErrors[String(i)] = `Ne peut pas dépasser ${max}`;
      }
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setToast({ message: "Remplissez les champs vides correctement", type: "error" });
      setTimeout(() => setToast(null), 3500);
      return;
    }

    if (!anyPositive) {
      setToast({ message: "Au moins une note doit être supérieure à 0", type: "error" });
      setTimeout(() => setToast(null), 3500);
      return;
    }

    // Confirm before final submit
    const ok = window.confirm("Êtes-vous sûr de vouloir enregistrer ? Une fois enregistré, vous ne pourrez plus modifier.");
    if (!ok) return;

    setLocked(true);
    const payload = {
      entry: {
        category: category || "",
        participantId: participant.id,
        participantName: participant.name,
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
      // success: disable further edits
      setSubmitted(true);
      setToast({ message: "Notes envoyées — vous ne pouvez plus modifier.", type: "success" });
      // notify other tabs (admin) to refresh immediately
      try {
        const bc = new (window as any).BroadcastChannel?.(`preselection-${eventSlug}`);
        if (bc) bc.postMessage({ type: "scoresUpdated", timestamp: Date.now() });
        else localStorage.setItem(`preselection-refresh-${eventSlug}`, String(Date.now()));
      } catch (e) {
        try {
          localStorage.setItem(`preselection-refresh-${eventSlug}`, String(Date.now()));
        } catch (err) {
          // ignore
        }
      }
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      console.error(e);
      setToast({ message: "Échec de l'envoi", type: "error" });
      setLocked(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handleModify = () => {
    setLocked(false);
    setHasEdited(true);
    setToast({ message: "Vous pouvez à présent modifier vos notes", type: "success" });
    setTimeout(() => setToast(null), 2500);
  };

  const handleResubmit = async () => {
    if (!eventSlug || !juryId) return;
    // Similar validation as handleSubmit
    const newFieldErrors: Record<string, string> = {};
    let anyPositive = false;
    for (let i = 0; i < criteria.length; i++) {
      const valRaw = scores[String(i)];
      const val = Number.isFinite(Number(valRaw)) ? Number(valRaw) : NaN;
      if (Number.isNaN(val)) {
        newFieldErrors[String(i)] = "Remplissez cette case";
      } else if (val < 1) {
        newFieldErrors[String(i)] = "La note doit être ≥ 1";
      } else {
        anyPositive = true;
      }
      const max = Number(criteria[i]?.maxScore || 0);
      if (max > 0 && !Number.isNaN(val) && val > max) {
        newFieldErrors[String(i)] = `Ne peut pas dépasser ${max}`;
      }
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setToast({ message: "Remplissez les champs vides correctement", type: "error" });
      setTimeout(() => setToast(null), 3500);
      return;
    }

    if (!anyPositive) {
      setToast({ message: "Au moins une note doit être supérieure à 0", type: "error" });
      setTimeout(() => setToast(null), 3500);
      return;
    }

    const ok = window.confirm("Êtes-vous sûr de vouloir enregistrer les modifications ?");
    if (!ok) return;

    setLocked(true);
    const payload = {
      entry: {
        category: category || "",
        participantId: participant.id,
        participantName: participant.name,
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
      setHasEdited(false);
      setToast({ message: "Notes modifiées et envoyées avec succès.", type: "success" });
      // notify other tabs (admin) to refresh immediately
      try {
        const bc = new (window as any).BroadcastChannel?.(`preselection-${eventSlug}`);
        if (bc) bc.postMessage({ type: "scoresUpdated", timestamp: Date.now() });
        else localStorage.setItem(`preselection-refresh-${eventSlug}`, String(Date.now()));
      } catch (e) {
        try {
          localStorage.setItem(`preselection-refresh-${eventSlug}`, String(Date.now()));
        } catch (err) {
          // ignore
        }
      }
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      console.error(e);
      setToast({ message: "Échec de l'envoi", type: "error" });
      setLocked(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-dark text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded shadow-lg ${toast.type === "error" ? "bg-red-600 text-white" : "bg-green-400 text-black"}`}>
          {toast.message}
        </div>
      )}
      <div className="max-w-2xl w-full bg-white/5 border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black mb-2">Préselection — {participant.name}</h2>
            <p className="text-sm text-white/40">Notation par critères</p>
          </div>
          {locked && (
            <button
              onClick={handleModify}
              className="px-4 py-2 bg-amber-500 text-black font-black uppercase hover:bg-amber-400 transition-colors"
            >
              Modifier
            </button>
          )}
        </div>

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
                  value={scores[String(i)] ?? 0}
                  onChange={(e) => updateScore(i, Math.max(0, Math.min(Number(c.maxScore || 10), Number(e.target.value || 0))))}
                  disabled={locked}
                  className={`w-full bg-black/40 border border-white/10 px-3 py-2 text-white font-bold ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
                />
                {fieldErrors[String(i)] && (
                  <div className="text-xs text-red-400 mt-1">{fieldErrors[String(i)]}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-white/40">Index: {currentIndex + 1}</div>
          <div className="flex items-center gap-3">
            <button
              onClick={hasEdited && submitted ? handleResubmit : handleSubmit}
              disabled={locked}
              className={`px-4 py-2 font-black uppercase ${locked ? "bg-white/20 text-white/40 cursor-not-allowed" : "bg-white text-black hover:bg-white/90"}`}
            >
              {hasEdited && submitted ? "Renvoyer" : "Envoyer"}
            </button>
            {locked && <div className="text-sm text-green-400">✓ Envoyé</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

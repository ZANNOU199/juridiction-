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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | null } | null>(null);
  const [savedScoresRaw, setSavedScoresRaw] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    const fetchSharedData = async () => {
      if (!eventSlug) return;
      try {
        const [cRes, mRes, scoresRes] = await Promise.all([
          fetch(`/api/preselection/${eventSlug}`),
          fetch(`/api/preselection/${eventSlug}/current`),
          fetch(`/api/preselection/${eventSlug}/scores-flat`),
        ]);

        if (!cRes.ok) throw new Error("Failed to load criteria");
        if (!mRes.ok) throw new Error("Failed to load current index");
        if (!scoresRes.ok) throw new Error("Failed to load saved scores");

        const cJson = await cRes.json();
        const mJson = await mRes.json();
        const sJson = await scoresRes.json();
        if (!mounted) return;

        const loadedCriteria = Array.isArray(cJson.criteria) ? cJson.criteria : [];
        const currentIndexValue = typeof mJson.currentIndex === "number" ? mJson.currentIndex : 0;
        const loadedScores = Array.isArray(sJson.scores) ? sJson.scores : [];

        setCriteria(loadedCriteria);
        setCurrentIndex(currentIndexValue);
        setSavedScoresRaw(loadedScores);
      } catch (e: any) {
        console.error(e);
        if (!mounted) return;
        setError(e.message || "Failed to load preselection data");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    const refreshFromEvent = async () => {
      if (!eventSlug) return;
      try {
        const [mRes, scoresRes] = await Promise.all([
          fetch(`/api/preselection/${eventSlug}/current`),
          fetch(`/api/preselection/${eventSlug}/scores-flat`),
        ]);
        if (!mRes.ok || !scoresRes.ok) return;
        const mJson = await mRes.json();
        const sJson = await scoresRes.json();
        if (!mounted) return;
        setCurrentIndex(typeof mJson.currentIndex === "number" ? mJson.currentIndex : 0);
        setSavedScoresRaw(Array.isArray(sJson.scores) ? sJson.scores : []);
      } catch (e) {
        // ignore update failures
      }
    };

    fetchSharedData();
    const interval = setInterval(refreshFromEvent, 2000);

    const bc = (window as any).BroadcastChannel ? new (window as any).BroadcastChannel(`preselection-${eventSlug}`) : null;
    const handleMessage = (event: any) => {
      if (event?.data?.type === "scoresUpdated" || event?.data?.type === "currentUpdated") {
        refreshFromEvent();
      }
    };
    bc?.addEventListener?.("message", handleMessage);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === `preselection-refresh-${eventSlug}`) {
        refreshFromEvent();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      mounted = false;
      clearInterval(interval);
      bc?.removeEventListener?.("message", handleMessage);
      bc?.close?.();
      window.removeEventListener("storage", handleStorage);
    };
  }, [eventSlug]);

  useEffect(() => {
    // Reset scores when criteria or index change only if user hasn't edited yet
    if (hasEdited) return;
    const initial: Record<string, number> = {};
    criteria.forEach((c, i) => {
      initial[String(i)] = 0;
    });
    setScores(initial);
    setLocked(false);
  }, [criteria, currentIndex, hasEdited]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-400">{error}</div>;

  const participant = participants[currentIndex] || { id: `p-${currentIndex + 1}`, name: "Participant inconnu" };
  const participantId = participant.id;
  const currentSubmitted = participantId ? hasSavedFor(participantId) : false;
  const canSubmitCurrent = !locked && !currentSubmitted;
  const listRows = participants.map((p, idx) => ({
    id: p.id,
    name: p.name,
    status: p.id ? (hasSavedFor(p.id) ? "Noté" : "En attente") : "En attente",
    isCurrent: idx === currentIndex,
  }));

  const currentParticipantTotal = participantId ? getSavedValue(participantId) : null;

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

  function normalizeScoreEntry(item: any) {
    if (!item) return null;
    if (item.entry) return item.entry;
    return item;
  }

  function hasSavedFor(participantId: string) {
    return savedScoresRaw.some((item) => {
      const entry = normalizeScoreEntry(item);
      return entry?.participantId === participantId && entry?.juryId === juryId;
    });
  }

  function getSavedValue(participantId: string) {
    const item = savedScoresRaw.find((item) => {
      const entry = normalizeScoreEntry(item);
      return entry?.participantId === participantId && entry?.juryId === juryId;
    });
    const entry = normalizeScoreEntry(item);
    if (!entry) return null;
    if (typeof entry.total === "number") return entry.total;
    if (Array.isArray(entry.scores)) {
      return entry.scores.reduce((sum: number, score: any) => sum + (Number(score?.score) || 0), 0);
    }
    return null;
  }

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
      const result = await res.json();
      // success: disable further edits and refresh saved scores from server
      setHasEdited(false);
      setFieldErrors({});
      setLocked(false);

      const scoresResponse = await fetch(`/api/preselection/${eventSlug}/scores-flat`);
      const scoresJson = scoresResponse.ok ? await scoresResponse.json() : { scores: result.scores };
      setSavedScoresRaw(Array.isArray(scoresJson.scores) ? scoresJson.scores : Array.isArray(result.scores) ? result.scores : savedScoresRaw);

      setToast({ message: "Notes envoyées — vous ne pouvez plus modifier.", type: "success" });
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      // notify other tabs (admin) to refresh immediately
      try {
        const bc = (window as any).BroadcastChannel ? new (window as any).BroadcastChannel(`preselection-${eventSlug}`) : null;
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
        <h2 className="text-xl font-black mb-2">Préselection — {participant.name}</h2>
        <p className="text-sm text-white/40 mb-4">Notation par critères</p>

        {currentSubmitted ? (
          <div className="text-white/80 mb-6">
            Vous avez déjà noté ce candidat. En attente que l’administrateur passe au prochain participant.
          </div>
        ) : (
          <>
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
                      className="w-full bg-black/40 border border-white/10 px-3 py-2 text-white font-bold"
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
                  onClick={handleSubmit}
                  disabled={!canSubmitCurrent}
                  className="px-4 py-2 bg-white text-black font-black uppercase disabled:opacity-50"
                >
                  Envoyer
                </button>
                {!canSubmitCurrent && currentSubmitted && (
                  <div className="text-sm text-white/40">Déjà noté, en attente du prochain candidat</div>
                )}
                {!canSubmitCurrent && !currentSubmitted && locked && (
                  <div className="text-sm text-white/40">Enregistrement en cours...</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="max-w-2xl w-full bg-white/5 border border-white/10 p-6 mt-6">
        <h3 className="text-lg font-black mb-4">Liste des candidats</h3>
        <p className="text-sm text-white/40 mb-4">
          Seul l’administrateur peut faire avancer le prochain candidat avec « Match suivant ». Vous ne pouvez pas choisir manuellement.
        </p>
        <div className="grid gap-2">
          {listRows.map((row) => (
            <div
              key={row.id}
              className={`flex items-center justify-between gap-4 p-3 rounded-lg border ${row.isCurrent ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-white/5"}`}>
              <div>
                <div className="font-bold text-white">{row.name}</div>
                <div className="text-[11px] text-white/50">{row.isCurrent ? "Candidat actuel" : ""}</div>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${row.status === "Noté" ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-white/70"}`}>
                {row.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";

interface PreselectionCriterion {
  id: string;
  name: string;
  maxScore: string;
}

interface EventTournament {
  id: string;
  category: string;
  participants?: Array<{ id: string; name: string }>;
}

interface EventSummary {
  tournaments: EventTournament[];
  juryAccounts: Array<{ id: string; username: string }>;
}

interface ScoreRow {
  category: string;
  participantId: string;
  participantName: string;
  juryScores: Record<string, string>;
}

interface ScoreEntry {
  category: string;
  participantId: string;
  participantName: string;
  juryId: string;
  juryName: string;
  total: number;
}

function createCriterion(): PreselectionCriterion {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    maxScore: "10",
  };
}

function buildScoreRows(
  tournaments: EventTournament[],
  juries: Array<{ id: string; username: string }>,
  savedScores: any[]
): ScoreRow[] {
  const scoreMap = new Map<string, string>();

  savedScores.forEach((entry: any) => {
    // Support multiple shapes: { category, participantId, juryId, total }
    // or wrapper { entry: { ... } } or legacy arrays
    const e = entry && entry.entry ? entry.entry : entry;
    const category = e?.category || entry?.category || "";
    const participantId = e?.participantId || entry?.participantId || "";
    const juryId = e?.juryId || entry?.juryId || "";

    const key = `${category}::${participantId}::${juryId}`;

    // Determine a numeric total: prefer explicit total, otherwise sum scores array if present
    let totalVal: number | null = null;
    if (typeof e?.total === "number") {
      totalVal = e.total;
    } else if (Array.isArray(e?.scores)) {
      totalVal = e.scores.reduce((s: number, it: any) => s + (Number(it?.score) || 0), 0);
    } else if (typeof entry?.total === "number") {
      totalVal = entry.total;
    }

    if (totalVal !== null && totalVal !== undefined) {
      scoreMap.set(key, String(totalVal));
    }
  });

  return tournaments.flatMap((tournament) => {
    const participants = tournament.participants || [];
    return participants.map((participant, index) => ({
      category: tournament.category,
      participantId: participant.id,
      participantName: participant.name || `Participant ${index + 1}`,
      juryScores: Object.fromEntries(
        juries.map((jury) => {
          const key = `${tournament.category}::${participant.id}::${jury.id}`;
          return [jury.id, scoreMap.get(key) || ""];
        })
      ),
    }));
  });
}

export function PreselectionAdmin() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();

  const [criteria, setCriteria] = useState<PreselectionCriterion[]>([createCriterion()]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingScores, setSavingScores] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [eventData, setEventData] = useState<EventSummary>({
    tournaments: [],
    juryAccounts: [],
  });
  const [savedScoresRaw, setSavedScoresRaw] = useState<any[]>([]);
  const [preselectionActive, setPreselectionActive] = useState(false);
  const [preselectionIndex, setPreselectionIndex] = useState(0);
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>([]);

  useEffect(() => {
    const loadPageData = async () => {
      if (!eventSlug) {
        setLoading(false);
        return;
      }

      try {
        const [criteriaRes, eventRes, scoresRes] = await Promise.all([
          fetch(`/api/preselection/${eventSlug}`),
          fetch(`/api/events/${eventSlug}`),
          fetch(`/api/preselection/${eventSlug}/scores`),
        ]);

        const loadedCriteria = criteriaRes.ok
          ? ((await criteriaRes.json())?.criteria as Array<Partial<PreselectionCriterion>> | undefined)
          : [];
        const loadedEvent = eventRes.ok ? await eventRes.json() : null;
        const loadedScores = scoresRes.ok
          ? (((await scoresRes.json())?.scores) || [])
          : [];

        const tournaments = (loadedEvent?.tournaments || []) as EventTournament[];
        const juries = (loadedEvent?.juryAccounts || []) as Array<{ id: string; username: string }>;

        setCriteria(
          loadedCriteria && loadedCriteria.length > 0
            ? loadedCriteria.map((item, index) => ({
                id: `${Date.now()}-${index}`,
                name: item.name || "",
                maxScore: item.maxScore?.toString() || "10",
              }))
            : [createCriterion()]
        );

        setEventData({ tournaments, juryAccounts: juries });
        const normalized = Array.isArray(loadedScores) ? loadedScores : [];
        setSavedScoresRaw(normalized);
        setScoreRows(buildScoreRows(eventData.tournaments || [], eventData.juryAccounts || [], normalized));

        // fetch preselection mode + index
        try {
          const modeRes = await fetch(`/api/preselection/${eventSlug}/mode`);
          if (modeRes.ok) {
            const modeJson = await modeRes.json();
            setPreselectionActive(Boolean(modeJson.active));
            setPreselectionIndex(Number(modeJson.currentIndex || 0));
          }
        } catch (e) {
          // ignore
        }
      } catch (error) {
        console.error("Failed to load preselection data", error);
      } finally {
        setLoading(false);
      }
    };

    loadPageData();
    // start polling saved scores so admin table updates live when juries send
    const poll = setInterval(async () => {
      if (!eventSlug) return;
      try {
        const res = await fetch(`/api/preselection/${eventSlug}/scores-flat`);
        if (!res.ok) return;
        const json = await res.json();
        const loadedScores = json.scores || [];
        setSavedScoresRaw(Array.isArray(loadedScores) ? loadedScores : []);
        setScoreRows(buildScoreRows(eventData.tournaments || [], eventData.juryAccounts || [], Array.isArray(loadedScores) ? loadedScores : []));
      } catch (e) {
        // ignore polling errors
      }
    }, 2500);
    // Listen for cross-tab updates (BroadcastChannel or storage fallback)
    try {
      const bc = (window as any).BroadcastChannel ? new (window as any).BroadcastChannel(`preselection-${eventSlug}`) : null;
      const onMessage = (msg: any) => {
        if (!eventSlug) return;
        if (msg?.data?.type === "scoresUpdated" || msg?.type === "scoresUpdated") {
          fetch(`/api/preselection/${eventSlug}/scores-flat`).then((r) => r.ok && r.json()).then((j) => {
            const loaded = (j?.scores) || [];
            setSavedScoresRaw(Array.isArray(loaded) ? loaded : []);
            setScoreRows(buildScoreRows(eventData.tournaments, eventData.juryAccounts, Array.isArray(loaded) ? loaded : []));
          }).catch(() => {});
        }
      };
      if (bc) {
        bc.addEventListener?.("message", onMessage);
      }
      const onStorage = (e: StorageEvent) => {
        if (!e.key || !eventSlug) return;
        if (e.key === `preselection-refresh-${eventSlug}`) {
          fetch(`/api/preselection/${eventSlug}/scores-flat`).then((r) => r.ok && r.json()).then((j) => {
            const loaded = (j?.scores) || [];
            setSavedScoresRaw(Array.isArray(loaded) ? loaded : []);
            setScoreRows(buildScoreRows(eventData.tournaments, eventData.juryAccounts, Array.isArray(loaded) ? loaded : []));
          }).catch(() => {});
        }
      };
      window.addEventListener("storage", onStorage);

      return () => {
        clearInterval(poll);
        try { if (bc) bc.removeEventListener?.("message", onMessage); } catch (e) {}
        window.removeEventListener("storage", onStorage);
      };
    } catch (e) {
      clearInterval(poll);
      return () => clearInterval(poll);
    }
  }, [eventSlug]);

  const updateCriterion = (id: string, field: "name" | "maxScore", value: string) => {
    setCriteria((prev) =>
      prev.map((criterion) => (criterion.id === id ? { ...criterion, [field]: value } : criterion))
    );
    setSaved(false);
  };

  const addCriterion = () => {
    setCriteria((prev) => [...prev, createCriterion()]);
    setSaved(false);
  };

  const removeCriterion = (id: string) => {
    setCriteria((prev) => {
      const next = prev.filter((criterion) => criterion.id !== id);
      return next.length > 0 ? next : [createCriterion()];
    });
    setSaved(false);
  };

  const handleSaveCriteria = async () => {
    const cleanedCriteria = criteria
      .map((criterion) => ({
        ...criterion,
        name: criterion.name.trim(),
        maxScore: criterion.maxScore.trim(),
      }))
      .filter((criterion) => criterion.name.length > 0);

    if (cleanedCriteria.length === 0) {
      alert("Ajoutez au moins un critère de notation.");
      return;
    }

    const invalidScore = cleanedCriteria.find((criterion) => {
      const parsed = Number(criterion.maxScore);
      return !criterion.maxScore || Number.isNaN(parsed) || parsed <= 0;
    });

    if (invalidScore) {
      alert("Le score maximum doit être un nombre supérieur à 0.");
      return;
    }

    if (!eventSlug) {
      alert("Aucun événement n’est associé à cette page.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/preselection/${eventSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria: cleanedCriteria }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save");
      }

      setSaved(true);
    } catch (error) {
      console.error("Failed to save preselection criteria", error);
      alert("L’enregistrement a échoué.");
    } finally {
      setSaving(false);
    }
  };

  const updateScore = (participantId: string, juryId: string, value: string) => {
    setScoreRows((prev) =>
      prev.map((row) =>
        row.participantId === participantId
          ? {
              ...row,
              juryScores: {
                ...row.juryScores,
                [juryId]: value,
              },
            }
          : row
      )
    );
    setScoreSaved(false);
  };

  const handleSaveScores = async () => {
    if (!eventSlug) {
      alert("Aucun événement n’est associé à cette page.");
      return;
    }

    try {
      setSavingScores(true);
      const juryLookup = Object.fromEntries(
        eventData.juryAccounts.map((jury) => [jury.id, jury.username])
      );

      const scores: ScoreEntry[] = scoreRows.flatMap((row) =>
        Object.entries(row.juryScores)
          .filter(([, value]) => typeof value === "string" && value.trim() !== "")
          .map(([juryId, value]) => ({
            category: row.category,
            participantId: row.participantId,
            participantName: row.participantName,
            juryId,
            juryName: juryLookup[juryId] || "Jury",
            total: Number(value),
          }))
      );

      const res = await fetch(`/api/preselection/${eventSlug}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save scores");
      }

      setScoreSaved(true);
      // refresh saved raw scores and ranking
      // After saving, refresh saved scores from server (to include jury submissions too)
      try {
        const refreshed = await fetch(`/api/preselection/${eventSlug}/scores`);
        const refreshedJson = refreshed.ok ? (await refreshed.json())?.scores || [] : [];
        const normalized = Array.isArray(refreshedJson) ? refreshedJson : [];
        setSavedScoresRaw(normalized);
        setScoreRows(buildScoreRows(eventData.tournaments, eventData.juryAccounts, normalized));
      } catch (e) {
        // fallback to what we have
        setSavedScoresRaw(scores);
        setScoreRows(buildScoreRows(eventData.tournaments, eventData.juryAccounts, scores));
      }
    } catch (error) {
      console.error("Failed to save preselection scores", error);
      alert("L’enregistrement des points a échoué.");
    } finally {
      setSavingScores(false);
    }
  };

  const hasSavedFor = (participantId: string, juryId: string) => {
    for (const item of savedScoresRaw) {
      const e = item.entry ? item.entry : item;
      if (!e) continue;
      if (e.participantId === participantId && e.juryId === juryId) return true;
      // also accept ScoreEntry format
      if (e.participantId === participantId && e.juryId === juryId) return true;
    }
    return false;
  };

  const getSavedValue = (participantId: string, juryId: string) => {
    for (const item of savedScoresRaw) {
      const e = item.entry ? item.entry : item;
      if (!e) continue;
      if (e.participantId === participantId && e.juryId === juryId) {
        // If e.total or e.scores available
        if (typeof e.total === "number") return e.total;
        if (Array.isArray(e.scores)) {
          return e.scores.reduce((sum: number, s: any) => sum + (Number(s.score) || 0), 0);
        }
      }
    }
    return null;
  };

  const togglePreselection = async (active: boolean) => {
    if (!eventSlug) return;
    try {
      const res = await fetch(`/api/preselection/${eventSlug}/mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (res.ok) {
        const json = await res.json();
        setPreselectionActive(Boolean(json.active));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const advanceToNext = async () => {
    if (!eventSlug) return;
    try {
      const nextIndex = preselectionIndex + 1;
      const res = await fetch(`/api/preselection/${eventSlug}/current`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: nextIndex }),
      });
      if (res.ok) {
        const json = await res.json();
        setPreselectionIndex(Number(json.currentIndex || nextIndex));

        try {
          const bc = (window as any).BroadcastChannel ? new (window as any).BroadcastChannel(`preselection-${eventSlug}`) : null;
          if (bc) bc.postMessage({ type: "currentUpdated", timestamp: Date.now() });
          else localStorage.setItem(`preselection-refresh-${eventSlug}`, String(Date.now()));
        } catch (broadcastError) {
          try {
            localStorage.setItem(`preselection-refresh-${eventSlug}`, String(Date.now()));
          } catch (err) {
            // ignore
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const allJuriesSubmittedForCurrent = () => {
    const tournaments = eventData.tournaments || [];
    const juries = eventData.juryAccounts || [];
    const participants = (tournaments[0]?.participants) || [];
    const participant = participants[preselectionIndex];
    if (!participant) return false;

    // Normalize saved scores to entries with participantId and juryId
    const entries: Array<{ participantId?: string; juryId?: string }> = [];
    for (const item of savedScoresRaw) {
      if (!item) continue;
      if (item.participantId && item.juryId) {
        entries.push({ participantId: item.participantId, juryId: item.juryId });
      } else if (item.entry) {
        const en = item.entry;
        if (en.participantId && en.juryId) entries.push({ participantId: en.participantId, juryId: en.juryId });
      } else if (Array.isArray(item)) {
        for (const sub of item) {
          if (sub.participantId && sub.juryId) entries.push({ participantId: sub.participantId, juryId: sub.juryId });
        }
      }
    }

    const submittedJuries = new Set(entries.filter(e => e.participantId === participant.id).map(e => e.juryId));
    return submittedJuries.size >= juries.length && juries.length > 0;
  };

  const maxPossibleScore = useMemo(() => {
    return criteria.reduce((sum, criterion) => {
      const parsed = Number(criterion.maxScore);
      return sum + (Number.isFinite(parsed) && parsed > 0 ? parsed : 10);
    }, 0);
  }, [criteria]);

  const rankedRows = useMemo(() => {
    return [...scoreRows]
      .map((row) => {
        const totalScore = Object.values(row.juryScores).reduce<number>((sum, rawValue) => {
          const parsed = Number(rawValue);
          return sum + (Number.isFinite(parsed) ? parsed : 0);
        }, 0);

        return { ...row, totalScore };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [scoreRows]);

  const passedParticipants = useMemo(() => {
    // determine participants that have submissions from all juries
    const juries = eventData.juryAccounts || [];
    const tournaments = eventData.tournaments || [];
    const participants = (tournaments[0]?.participants) || [];
    const map = new Map<string, Set<string>>();
    for (const item of savedScoresRaw) {
      // normalize structure
      if (!item) continue;
      if (item.participantId && item.juryId) {
        const set = map.get(item.participantId) || new Set<string>();
        set.add(item.juryId);
        map.set(item.participantId, set);
      } else if (item.entry) {
        const en = item.entry;
        if (en.participantId && en.juryId) {
          const set = map.get(en.participantId) || new Set<string>();
          set.add(en.juryId);
          map.set(en.participantId, set);
        }
      } else if (Array.isArray(item)) {
        for (const sub of item) {
          if (sub.participantId && sub.juryId) {
            const set = map.get(sub.participantId) || new Set<string>();
            set.add(sub.juryId);
            map.set(sub.participantId, set);
          }
        }
      }
    }

    const passed = new Set<string>();
    for (const p of participants) {
      const set = map.get(p.id) || new Set<string>();
      if (set.size >= juries.length && juries.length > 0) {
        passed.add(p.id);
      }
    }
    return passed;
  }, [savedScoresRaw, eventData]);

  const juryTotals = useMemo(() => {
    return eventData.juryAccounts.reduce<Record<string, number>>((acc, jury) => {
      acc[jury.id] = scoreRows.reduce((sum, row) => {
        const parsed = Number(row.juryScores[jury.id]);
        return sum + (Number.isFinite(parsed) ? parsed : 0);
      }, 0);
      return acc;
    }, {});
  }, [eventData.juryAccounts, scoreRows]);

  // Load initial page data once when eventSlug changes
  useEffect(() => {
    const loadPageData = async () => {
      if (!eventSlug) {
        setLoading(false);
        return;
      }

      try {
        const [criteriaRes, eventRes, scoresRes] = await Promise.all([
          fetch(`/api/preselection/${eventSlug}`),
          fetch(`/api/events/${eventSlug}`),
          fetch(`/api/preselection/${eventSlug}/scores`),
        ]);

        const loadedCriteria = criteriaRes.ok
          ? ((await criteriaRes.json())?.criteria as Array<Partial<PreselectionCriterion>> | undefined)
          : [];
        const loadedEvent = eventRes.ok ? await eventRes.json() : null;
        const loadedScores = scoresRes.ok
          ? (((await scoresRes.json())?.scores) || [])
          : [];

        const tournaments = (loadedEvent?.tournaments || []) as EventTournament[];
        const juries = (loadedEvent?.juryAccounts || []) as Array<{ id: string; username: string }>;

        setCriteria(
          loadedCriteria && loadedCriteria.length > 0
            ? loadedCriteria.map((item, index) => ({
                id: `${Date.now()}-${index}`,
                name: item.name || "",
                maxScore: item.maxScore?.toString() || "10",
              }))
            : [createCriterion()]
        );

        setEventData({ tournaments, juryAccounts: juries });
        const normalized = Array.isArray(loadedScores) ? loadedScores : [];
        setSavedScoresRaw(normalized);
        setScoreRows(buildScoreRows(tournaments, juries, normalized));

        // fetch preselection mode + index
        try {
          const modeRes = await fetch(`/api/preselection/${eventSlug}/mode`);
          if (modeRes.ok) {
            const modeJson = await modeRes.json();
            setPreselectionActive(Boolean(modeJson.active));
            setPreselectionIndex(Number(modeJson.currentIndex || 0));
          }
        } catch (e) {
          // ignore
        }
      } catch (error) {
        console.error("Failed to load preselection data", error);
      } finally {
        setLoading(false);
      }
    };

    loadPageData();
  }, [eventSlug]);

  // Polling + cross-tab listeners: refresh saved scores and recompute rows when updates arrive
  useEffect(() => {
    if (!eventSlug) return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/preselection/${eventSlug}/scores-flat`);
        if (!res.ok) return;
        const json = await res.json();
        const loadedScores = json.scores || [];
        setSavedScoresRaw(Array.isArray(loadedScores) ? loadedScores : []);
        setScoreRows(buildScoreRows(eventData.tournaments || [], eventData.juryAccounts || [], Array.isArray(loadedScores) ? loadedScores : []));
      } catch (e) {
        // ignore polling errors
      }
    }, 2500);

    // BroadcastChannel + storage fallback listener
    try {
      const bc = (window as any).BroadcastChannel ? new (window as any).BroadcastChannel(`preselection-${eventSlug}`) : null;
      const onMessage = (msg: any) => {
        if (msg?.data?.type === "scoresUpdated" || msg?.type === "scoresUpdated") {
          fetch(`/api/preselection/${eventSlug}/scores-flat`).then((r) => r.ok && r.json()).then((j) => {
            const loaded = (j?.scores) || [];
            setSavedScoresRaw(Array.isArray(loaded) ? loaded : []);
            setScoreRows(buildScoreRows(eventData.tournaments || [], eventData.juryAccounts || [], Array.isArray(loaded) ? loaded : []));
          }).catch(() => {});
        }
      };
      if (bc) bc.addEventListener?.("message", onMessage);

      const onStorage = (e: StorageEvent) => {
        if (!e.key) return;
        if (e.key === `preselection-refresh-${eventSlug}`) {
          fetch(`/api/preselection/${eventSlug}/scores-flat`).then((r) => r.ok && r.json()).then((j) => {
            const loaded = (j?.scores) || [];
            setSavedScoresRaw(Array.isArray(loaded) ? loaded : []);
            setScoreRows(buildScoreRows(eventData.tournaments || [], eventData.juryAccounts || [], Array.isArray(loaded) ? loaded : []));
          }).catch(() => {});
        }
      };
      window.addEventListener("storage", onStorage);

      return () => {
        clearInterval(poll);
        try { if (bc) bc.removeEventListener?.("message", onMessage); } catch (e) {}
        window.removeEventListener("storage", onStorage);
      };
    } catch (e) {
      clearInterval(poll);
      return () => clearInterval(poll);
    }
  }, [eventSlug, eventData]);
  const overallTotal = Object.values(juryTotals).reduce((s: number, v: any) => s + (Number(v) || 0), 0);

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <button
              type="button"
              onClick={() => togglePreselection(!preselectionActive)}
              className={`px-3 py-2 font-bold uppercase ${preselectionActive ? "bg-green-600 text-black" : "bg-white/5 text-white/60"}`}
            >
              {preselectionActive ? "Actif" : "Inactif"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-white/60">Index</label>
            <div className="px-3 py-2 bg-white/5 text-white/80">{preselectionIndex + 1}</div>
          </div>
          <button onClick={advanceToNext} disabled={!allJuriesSubmittedForCurrent()} className={`px-3 py-2 font-bold uppercase ${allJuriesSubmittedForCurrent() ? "bg-green-600 text-black" : "bg-white/5 text-white/60"}`}>
            Match suivant
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
          {scoreSaved && (
            <div className="mb-6 border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">Les points ont bien été enregistrés.</div>
          )}

          {eventData.juryAccounts.length === 0 ? (
            <div className="text-white/50">Aucun jury n’a encore été associé à cet événement.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-white/80">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
                    <th className="px-3 py-3">Participant</th>
                    <th className="px-3 py-3">Catégorie</th>
                    {eventData.juryAccounts.map((jury) => (
                      <th key={jury.id} className="px-3 py-3 whitespace-nowrap">{jury.username}</th>
                    ))}
                    <th className="px-3 py-3">Total</th>
                    <th className="px-3 py-3">Classement</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedRows.map((row, index) => (
                    <tr key={`${row.participantId}-${row.category}`} className="border-b border-white/10">
                      <td className="px-3 py-3 font-semibold text-white">{row.participantName}</td>
                      <td className="px-3 py-3 text-white/60">{row.category}</td>
                      {eventData.juryAccounts.map((jury) => {
                        const saved = hasSavedFor(row.participantId, jury.id);
                        const savedVal = getSavedValue(row.participantId, jury.id);
                        return (
                          <td key={`${row.participantId}-${jury.id}`} className="px-3 py-3">
                            <input
                              type="number"
                              min={0}
                              max={maxPossibleScore}
                              value={savedVal != null ? String(savedVal) : row.juryScores[jury.id] || ""}
                              onChange={(e) => updateScore(row.participantId, jury.id, e.target.value)}
                              className={`w-24 border border-white/10 px-2 py-1 focus:outline-none focus:border-white/30 ${saved ? "bg-green-600/30 text-black" : "bg-white/5 text-white"}`}
                              disabled={saved}
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 font-bold text-amber-300">{row.totalScore}</td>
                      <td className="px-3 py-3 font-bold text-white">#{index + 1}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-white/20 bg-white/5">
                    <td className="px-3 py-3 font-bold uppercase text-white/70">Total par jury</td>
                    <td className="px-3 py-3" />
                    {eventData.juryAccounts.map((jury) => (
                      <td key={`summary-${jury.id}`} className="px-3 py-3 font-bold text-amber-300">{juryTotals[jury.id] || 0}</td>
                    ))}
                    <td className="px-3 py-3 font-bold text-amber-300">{overallTotal}</td>
                    <td className="px-3 py-3" />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

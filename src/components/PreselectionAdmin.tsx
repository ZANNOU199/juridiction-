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
  savedScores: ScoreEntry[]
): ScoreRow[] {
  const scoreMap = new Map<string, string>();

  savedScores.forEach((entry) => {
    const key = `${entry.category}::${entry.participantId}::${entry.juryId}`;
    scoreMap.set(key, entry.total.toString());
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
          ? (((await scoresRes.json())?.scores as ScoreEntry[]) || [])
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
        setScoreRows(buildScoreRows(tournaments, juries, loadedScores));
      } catch (error) {
        console.error("Failed to load preselection data", error);
      } finally {
        setLoading(false);
      }
    };

    loadPageData();
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
    } catch (error) {
      console.error("Failed to save preselection scores", error);
      alert("L’enregistrement des points a échoué.");
    } finally {
      setSavingScores(false);
    }
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

  const juryTotals = useMemo(() => {
    return eventData.juryAccounts.reduce<Record<string, number>>((acc, jury) => {
      acc[jury.id] = scoreRows.reduce((sum, row) => {
        const parsed = Number(row.juryScores[jury.id]);
        return sum + (Number.isFinite(parsed) ? parsed : 0);
      }, 0);
      return acc;
    }, {});
  }, [eventData.juryAccounts, scoreRows]);

  const overallTotal = useMemo(() => {
    return Object.values(juryTotals).reduce<number>((sum, value) => sum + Number(value || 0), 0);
  }, [juryTotals]);

  return (
    <div className="min-h-screen bg-surface-dark bg-[radial-gradient(circle_at_50%_50%,_rgba(30,41,59,0.2)_0%,_rgba(5,5,5,1)_100%)] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(`/admin`)} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-bold uppercase">Retour</span>
          </button>
          <div>
            <h1 className="text-3xl font-black italic text-white uppercase">Préselection</h1>
            <p className="text-sm text-white/45 mt-1">Définissez les critères, puis visualisez les points par jury et le classement.</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white/5 border border-white/10 p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black italic text-white uppercase">Critères de notation</h2>
                <p className="text-sm text-white/50 mt-1">{eventSlug ? `Événement : ${eventSlug}` : "Configuration locale"}</p>
              </div>
              <button onClick={handleSaveCriteria} disabled={saving} className="bg-green-600/30 hover:bg-green-600/50 border border-green-500/30 text-green-300 px-4 py-2 font-bold uppercase flex items-center gap-2 transition-all disabled:opacity-60">
                <Save className="w-4 h-4" />
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>

            {saved && <div className="mb-6 border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">Critères enregistrés avec succès.</div>}

            {loading ? (
              <div className="text-white/50">Chargement…</div>
            ) : (
              <div className="space-y-4">
                {criteria.map((criterion, index) => (
                  <div key={criterion.id} className="grid gap-3 md:grid-cols-[2fr_1fr_auto] items-end p-4 bg-white/5 border border-white/10">
                    <div>
                      <label className="block text-[10px] font-bold text-white/60 uppercase mb-2">Critère {index + 1}</label>
                      <input type="text" value={criterion.name} onChange={(e) => updateCriterion(criterion.id, "name", e.target.value)} placeholder="Ex. Technique" className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 placeholder-white/20 focus:outline-none focus:border-white/30" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-white/60 uppercase mb-2">Note max.</label>
                      <input type="number" min="1" value={criterion.maxScore} onChange={(e) => updateCriterion(criterion.id, "maxScore", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 focus:outline-none focus:border-white/30" />
                    </div>
                    <button type="button" onClick={() => removeCriterion(criterion.id)} className="p-2 border border-white/10 hover:bg-red-500/20 text-white/60 hover:text-red-300 transition-all" title="Supprimer ce critère">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addCriterion} className="w-full border border-dashed border-white/20 hover:border-white/40 text-white/70 hover:text-white py-3 font-bold uppercase flex items-center justify-center gap-2 transition-all">
                  <Plus className="w-4 h-4" />
                  Ajouter un critère
                </button>
              </div>
            )}
          </div>

          <div className="bg-white/5 border border-white/10 p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black italic text-white uppercase">Tableau de présélection</h2>
                <p className="text-sm text-white/50 mt-1">Note maximale possible : {maxPossibleScore} points</p>
              </div>
              <button onClick={handleSaveScores} disabled={savingScores} className="bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/30 text-blue-200 px-4 py-2 font-bold uppercase flex items-center gap-2 transition-all disabled:opacity-60">
                <Save className="w-4 h-4" />
                {savingScores ? "Sauvegarde..." : "Sauvegarder les points"}
              </button>
            </div>

            {scoreSaved && <div className="mb-6 border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">Les points ont bien été enregistrés.</div>}

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
                        {eventData.juryAccounts.map((jury) => (
                          <td key={`${row.participantId}-${jury.id}`} className="px-3 py-3">
                            <input type="number" min="0" max={maxPossibleScore} value={row.juryScores[jury.id] || ""} onChange={(e) => updateScore(row.participantId, jury.id, e.target.value)} className="w-24 bg-white/5 border border-white/10 text-white px-2 py-1 focus:outline-none focus:border-white/30" />
                          </td>
                        ))}
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
    </div>
  );
}

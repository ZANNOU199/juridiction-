import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";

interface PreselectionCriterion {
  id: string;
  name: string;
  maxScore: string;
}

function createCriterion(): PreselectionCriterion {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    maxScore: "10",
  };
}

export function PreselectionAdmin() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();

  const [criteria, setCriteria] = useState<PreselectionCriterion[]>([createCriterion()]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const storageKey = useMemo(() => {
    return eventSlug ? `juge_preselection_${eventSlug}` : "juge_preselection";
  }, [eventSlug]);

  useEffect(() => {
    try {
      const savedCriteria = localStorage.getItem(storageKey);
      if (savedCriteria) {
        const parsed = JSON.parse(savedCriteria);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCriteria(
            parsed.map((item: Partial<PreselectionCriterion>, index: number) => ({
              id: item.id || `${Date.now()}-${index}`,
              name: item.name || "",
              maxScore: item.maxScore?.toString() || "10",
            }))
          );
        }
      }
    } catch (error) {
      console.error("Failed to load preselection criteria", error);
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  const updateCriterion = (id: string, field: "name" | "maxScore", value: string) => {
    setCriteria((prev) =>
      prev.map((criterion) =>
        criterion.id === id ? { ...criterion, [field]: value } : criterion
      )
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

  const handleSave = () => {
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

    try {
      localStorage.setItem(storageKey, JSON.stringify(cleanedCriteria));
      setSaved(true);
    } catch (error) {
      console.error("Failed to save preselection criteria", error);
      alert("L’enregistrement a échoué.");
    }
  };

  return (
    <div className="min-h-screen bg-surface-dark bg-[radial-gradient(circle_at_50%_50%,_rgba(30,41,59,0.2)_0%,_rgba(5,5,5,1)_100%)] p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(`/admin`)}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-bold uppercase">Retour</span>
          </button>
          <div>
            <h1 className="text-3xl font-black italic text-white uppercase">Préselection</h1>
            <p className="text-sm text-white/45 mt-1">
              Définissez les critères et la note maximale pour cette catégorie.
            </p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black italic text-white uppercase">Critères de notation</h2>
              <p className="text-sm text-white/50 mt-1">
                {eventSlug ? `Événement : ${eventSlug}` : "Configuration locale"}
              </p>
            </div>
            <button
              onClick={handleSave}
              className="bg-green-600/30 hover:bg-green-600/50 border border-green-500/30 text-green-300 px-4 py-2 font-bold uppercase flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              Enregistrer
            </button>
          </div>

          {saved && (
            <div className="mb-6 border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              Critères enregistrés avec succès.
            </div>
          )}

          {loading ? (
            <div className="text-white/50">Chargement…</div>
          ) : (
            <div className="space-y-4">
              {criteria.map((criterion, index) => (
                <div key={criterion.id} className="grid gap-3 md:grid-cols-[2fr_1fr_auto] items-end p-4 bg-white/5 border border-white/10">
                  <div>
                    <label className="block text-[10px] font-bold text-white/60 uppercase mb-2">
                      Critère {index + 1}
                    </label>
                    <input
                      type="text"
                      value={criterion.name}
                      onChange={(e) => updateCriterion(criterion.id, "name", e.target.value)}
                      placeholder="Ex. Technique"
                      className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 placeholder-white/20 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/60 uppercase mb-2">
                      Note max.
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={criterion.maxScore}
                      onChange={(e) => updateCriterion(criterion.id, "maxScore", e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCriterion(criterion.id)}
                    className="p-2 border border-white/10 hover:bg-red-500/20 text-white/60 hover:text-red-300 transition-all"
                    title="Supprimer ce critère"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addCriterion}
                className="w-full border border-dashed border-white/20 hover:border-white/40 text-white/70 hover:text-white py-3 font-bold uppercase flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                Ajouter un critère
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

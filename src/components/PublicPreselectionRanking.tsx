import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

interface EventTournament {
  id: string;
  category: string;
  participants?: Array<{ id: string; name: string }>;
}

interface EventSummary {
  eventName?: string;
  eventSlug?: string;
  eventLogo?: string;
  tournaments: EventTournament[];
}

interface RankingRow {
  category: string;
  participantId: string;
  participantName: string;
  totalScore: number;
}

export function PublicPreselectionRanking() {
  const { eventSlug, category: categoryFromRoute } = useParams<{ eventSlug: string; category?: string }>();
  const [eventData, setEventData] = useState<EventSummary>({ tournaments: [] });
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!eventSlug) {
        setLoading(false);
        return;
      }

      try {
        const [eventRes, scoresRes] = await Promise.all([
          fetch(`/api/events/${eventSlug}`),
          fetch(`/api/preselection/${eventSlug}/scores-flat`),
        ]);

        if (eventRes.ok) {
          const eventJson = await eventRes.json();
          setEventData({
            eventName: eventJson?.eventName || eventSlug,
            eventSlug,
            eventLogo: eventJson?.eventLogo || "",
            tournaments: Array.isArray(eventJson?.tournaments) ? eventJson.tournaments : [],
          });
        }

        if (scoresRes.ok) {
          const scoresJson = await scoresRes.json();
          setScores(Array.isArray(scoresJson?.scores) ? scoresJson.scores : []);
        }
      } catch (error) {
        console.error("Failed to load preselection ranking", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventSlug]);

  const visibleTournaments = useMemo(() => {
    if (!eventData.tournaments.length) return [];
    if (categoryFromRoute) {
      return eventData.tournaments.filter((t) => t.category === categoryFromRoute);
    }
    return eventData.tournaments;
  }, [eventData.tournaments, categoryFromRoute]);

  const rankingRows = useMemo<RankingRow[]>(() => {
    const rows: RankingRow[] = [];

    visibleTournaments.forEach((tournament) => {
      const participants = tournament.participants || [];
      participants.forEach((participant) => {
        let totalScore = 0;
        scores.forEach((item) => {
          const entry = item?.entry ? item.entry : item;
          if (!entry) return;
          if (entry.category !== tournament.category) return;
          if (entry.participantId !== participant.id) return;
          if (typeof entry.total === "number") {
            totalScore += entry.total;
          } else if (Array.isArray(entry.scores)) {
            totalScore += entry.scores.reduce((sum: number, s: any) => sum + (Number(s.score) || 0), 0);
          }
        });

        rows.push({
          category: tournament.category,
          participantId: participant.id,
          participantName: participant.name || "Participant",
          totalScore,
        });
      });
    });

    return rows.sort((a, b) => b.totalScore - a.totalScore);
  }, [scores, visibleTournaments]);

  const title = categoryFromRoute ? `Classement ${categoryFromRoute}` : "Classement";

  return (
    <div
      className="fixed inset-0 bg-surface-dark bg-cover bg-no-repeat flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: eventData.eventLogo ? `url('${eventData.eventLogo}')` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black/70" />
      
      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center justify-center px-3" style={{ height: "100vh", paddingTop: "0.5rem", paddingBottom: "0.5rem" }}>
        <div className="text-center mb-1">
          <h1 className="text-5xl md:text-6xl font-black italic text-white uppercase tracking-wide">{title}</h1>
        </div>

        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-lg p-2 shadow-2xl w-full flex-1 flex flex-col overflow-hidden">
          {loading ? (
            <div className="text-white/60 text-center py-6 text-base">Chargement du classement…</div>
          ) : rankingRows.length === 0 ? (
            <div className="text-white/60 text-center py-6 text-base">Aucun classement disponible pour l'instant.</div>
          ) : (
            <div className="overflow-y-auto flex-1 w-full">
              <table className="w-full text-2xl text-left text-white">
                <thead className="sticky top-0">
                  <tr className="bg-gradient-to-r from-red-600/40 to-red-500/30 border-b-2 border-red-400/50">
                    <th className="px-4 py-2 font-black uppercase text-red-200 text-2xl tracking-wider w-20">Rang</th>
                    <th className="px-4 py-2 font-black uppercase text-red-200 text-2xl tracking-wider">Participant</th>
                    <th className="px-4 py-2 font-black uppercase text-red-200 text-2xl tracking-wider text-right w-24">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingRows.map((row, index) => (
                    <tr
                      key={`${row.category}-${row.participantId}`}
                      className={`${
                        index === 0
                          ? "bg-red-500/20 border-l-4 border-red-400"
                          : index === 1
                          ? "bg-gray-400/10 border-l-4 border-gray-300"
                          : index === 2
                          ? "bg-orange-700/15 border-l-4 border-orange-600"
                          : "bg-white/5 border-l-4 border-transparent hover:bg-white/10"
                      } ${
                        index === 8 ? "border-t-4 border-red-500" : "border-b border-white/10"
                      } transition-colors ${
                        index >= 8 ? "opacity-60" : ""
                      }`}
                      style={{
                        borderRight: index < 8 ? "6px solid rgb(239, 68, 68)" : "none",
                      }}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center">
                          <span className={`font-black text-4xl text-red-300`}>{index + 1}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-2 font-semibold text-white text-3xl ${index >= 8 ? "line-through" : ""}`}>{row.participantName}</td>
                      <td className={`px-4 py-2 font-black text-right text-red-300 text-3xl ${index >= 8 ? "line-through" : ""}`}>{row.totalScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

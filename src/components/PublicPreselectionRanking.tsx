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
    <div className="min-h-screen bg-surface-dark bg-[radial-gradient(circle_at_50%_50%,_rgba(30,41,59,0.2)_0%,_rgba(5,5,5,1)_100%)] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black italic text-white uppercase">{title}</h1>
          <p className="text-sm text-white/45 mt-1">{eventData.eventName || eventSlug}</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 md:p-8">
          {loading ? (
            <div className="text-white/50">Chargement du classement…</div>
          ) : rankingRows.length === 0 ? (
            <div className="text-white/50">Aucun classement disponible pour l’instant.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-white/80">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
                    <th className="px-3 py-3">Classement</th>
                    <th className="px-3 py-3">Participant</th>
                    <th className="px-3 py-3">Points totaux</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingRows.map((row, index) => (
                    <tr key={`${row.category}-${row.participantId}`} className="border-b border-white/10">
                      <td className="px-3 py-3 font-bold text-amber-300">{index + 1}</td>
                      <td className="px-3 py-3 font-semibold text-white">{row.participantName}</td>
                      <td className="px-3 py-3 font-bold text-white">{row.totalScore}</td>
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

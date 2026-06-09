import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

interface TournamentState {
  competitionName: string;
  competitionLogo: string;
}

export function WaitingPage() {
  const { eventSlug, category } = useParams<{ eventSlug: string; category: string }>();
  const [state, setState] = useState<TournamentState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventSlug || !category) {
      setLoading(false);
      return;
    }

    const fetchState = async () => {
      try {
        const res = await fetch(`/api/${eventSlug}/${category}/state`);
        if (res.ok) {
          const data = await res.json();
          setState(data);
        }
      } catch (error) {
        console.error("Failed to fetch event state:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchState();
    // Poll every 2 seconds for updates
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, [eventSlug, category]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      {loading ? (
        <div className="animate-spin w-12 h-12 border-3 border-white/20 border-t-white rounded-full" />
      ) : state?.competitionLogo ? (
        <div className="max-w-md w-full flex flex-col items-center justify-center">
          <img
            src={state.competitionLogo}
            alt={state.competitionName}
            className="w-full h-auto max-w-xs scale-200"
          />
        </div>
      ) : (
        <div className="text-center">
          <div className="text-white/60 text-lg">
            {state?.competitionName || "Event"}
          </div>
          <p className="text-white/40 text-sm mt-4">Veuillez patienter...</p>
        </div>
      )}
    </div>
  );
}

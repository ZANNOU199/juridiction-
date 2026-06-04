import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

interface JuryAccount {
  id: string;
  username: string;
}

interface Tournament {
  id: string;
  category: string;
}

interface JuryAssignment {
  juryId: string;
  username: string;
}

export function JuryManager() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();
  
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [juryAccounts, setJuryAccounts] = useState<JuryAccount[]>([]);
  const [juryAssignments, setJuryAssignments] = useState<Record<string, JuryAssignment[]>>({});
  const [loading, setLoading] = useState(true);
  const [newJuryUsername, setNewJuryUsername] = useState("");
  const [newJuryPassword, setNewJuryPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [assigningCategoryId, setAssigningCategoryId] = useState<string>("");

  useEffect(() => {
    if (!eventSlug) return;
    loadData();
  }, [eventSlug]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get event with tournaments
      const eventRes = await fetch(`/api/events/${eventSlug}`);
      if (eventRes.ok) {
        const event = await eventRes.json();
        setTournaments(event.tournaments || []);
      }

      // Get jury accounts
      const juriesRes = await fetch(`/api/jury-accounts/${eventSlug}`);
      if (juriesRes.ok) {
        const juries = await juriesRes.json();
        setJuryAccounts(juries);
      }

      // Get jury assignments
      const assignRes = await fetch(`/api/jury-assignments/${eventSlug}`);
      if (assignRes.ok) {
        const assignments = await assignRes.json();
        setJuryAssignments(assignments || {});
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJury = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJuryUsername.trim() || !newJuryPassword.trim()) return;

    try {
      const res = await fetch(`/api/jury-accounts/${eventSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newJuryUsername,
          password: newJuryPassword,
        }),
      });

      if (res.ok) {
        const newJury = await res.json();
        setJuryAccounts([...juryAccounts, newJury]);
        setNewJuryUsername("");
        setNewJuryPassword("");
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create jury");
      }
    } catch (error) {
      console.error("Failed to create jury:", error);
      alert("Error creating jury");
    }
  };

  const handleAssignJury = async (tournamentId: string, juryId: string) => {
    try {
      const res = await fetch(
        `/api/jury-assignments/${eventSlug}/${tournamentId}/${juryId}`,
        { method: "POST" }
      );

      if (res.ok) {
        await loadData();
        setAssigningCategoryId("");
      } else {
        alert("Failed to assign jury");
      }
    } catch (error) {
      console.error("Failed to assign jury:", error);
      alert("Error assigning jury");
    }
  };

  const handleRemoveAssignment = async (tournamentId: string, juryId: string) => {
    try {
      const res = await fetch(
        `/api/jury-assignments/${eventSlug}/${tournamentId}/${juryId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setJuryAssignments((prev) => ({
          ...prev,
          [tournamentId]: prev[tournamentId]?.filter((j) => j.juryId !== juryId) || [],
        }));
      } else {
        alert("Failed to remove assignment");
      }
    } catch (error) {
      console.error("Failed to remove assignment:", error);
      alert("Error removing assignment");
    }
  };

  const handleDeleteJury = async (juryId: string) => {
    if (!confirm("Are you sure? This jury will be removed from all categories.")) return;

    try {
      const res = await fetch(`/api/jury-accounts/${eventSlug}/${juryId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setJuryAccounts(juryAccounts.filter((j) => j.id !== juryId));
        const newAssignments = { ...juryAssignments };
        Object.keys(newAssignments).forEach((key) => {
          newAssignments[key] = newAssignments[key].filter((j) => j.juryId !== juryId);
        });
        setJuryAssignments(newAssignments);
      } else {
        alert("Failed to delete jury");
      }
    } catch (error) {
      console.error("Failed to delete jury:", error);
      alert("Error deleting jury");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-white/10 border-t-white rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dark bg-[radial-gradient(circle_at_50%_50%,_rgba(30,41,59,0.2)_0%,_rgba(5,5,5,1)_100%)] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(`/admin`)}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-bold uppercase">Back to Events</span>
          </button>
          <h1 className="text-3xl font-black italic text-white uppercase">
            Jury Management
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel: Create Jury + List */}
          <div className="space-y-6">
            {/* Create Jury Form */}
            <div className="bg-white/5 border border-white/10 p-6">
              <h2 className="text-lg font-black italic text-white uppercase mb-6">
                Create Jury
              </h2>

              <form onSubmit={handleCreateJury} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/60 uppercase mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={newJuryUsername}
                    onChange={(e) => setNewJuryUsername(e.target.value)}
                    placeholder="e.g. Judge1"
                    className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 placeholder-white/20 focus:outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/60 uppercase mb-2">
                    Password
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newJuryPassword}
                      onChange={(e) => setNewJuryPassword(e.target.value)}
                      placeholder="••••••••"
                      className="flex-1 bg-white/5 border border-white/10 text-white px-3 py-2 placeholder-white/20 focus:outline-none focus:border-white/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white/60 transition-all"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-green-600/30 hover:bg-green-600/50 border border-green-500/30 text-green-300 px-4 py-2 font-bold uppercase flex items-center justify-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Create Jury
                </button>
              </form>
            </div>

            {/* Juries List */}
            <div className="bg-white/5 border border-white/10 p-6">
              <h2 className="text-lg font-black italic text-white uppercase mb-4">
                All Juries ({juryAccounts.length})
              </h2>
              
              <div className="space-y-2">
                {juryAccounts.map((jury) => (
                  <div
                    key={jury.id}
                    className="flex items-center justify-between p-3 bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                  >
                    <span className="text-sm text-white font-bold">{jury.username}</span>
                    <button
                      onClick={() => handleDeleteJury(jury.id)}
                      className="p-1 hover:bg-red-500/20 transition-all"
                      title="Delete jury"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}
                {juryAccounts.length === 0 && (
                  <p className="text-xs text-white/40 py-4">No juries created yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Categories with Assign Button */}
          <div className="bg-white/5 border border-white/10 p-6">
            <h2 className="text-lg font-black italic text-white uppercase mb-6">
              Categories
            </h2>

            <div className="space-y-4">
              {tournaments.length === 0 ? (
                <p className="text-white/40">No categories available</p>
              ) : (
                tournaments.map((tournament) => (
                  <div key={tournament.id} className="border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-white uppercase">
                        {tournament.category}
                      </h3>
                      <button
                        onClick={() => {
                          if (assigningCategoryId === tournament.id) {
                            setAssigningCategoryId("");
                          } else {
                            setAssigningCategoryId(tournament.id);
                          }
                        }}
                        className="bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/30 text-blue-300 px-3 py-1 text-sm font-bold uppercase transition-all"
                      >
                        {assigningCategoryId === tournament.id ? "Cancel" : "Assign"}
                      </button>
                    </div>

                    {/* Assign Jury Section */}
                    {assigningCategoryId === tournament.id && (
                      <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30">
                        <p className="text-xs text-blue-300 font-bold mb-2">SELECT JURY TO ASSIGN:</p>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignJury(tournament.id, e.target.value);
                            }
                          }}
                          defaultValue=""
                          className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 focus:outline-none focus:border-white/30 text-sm"
                        >
                          <option value="">Select a jury...</option>
                          {juryAccounts
                            .filter(
                              (j) =>
                                !(juryAssignments[tournament.id] || []).some(
                                  (a) => a.juryId === j.id
                                )
                            )
                            .map((jury) => (
                              <option key={jury.id} value={jury.id}>
                                {jury.username}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {/* Assigned Juries for this category */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-white/60 uppercase">
                        Assigned Juries ({(juryAssignments[tournament.id] || []).length})
                      </p>
                      {(juryAssignments[tournament.id] || []).length === 0 ? (
                        <p className="text-xs text-white/40 py-2">No juries assigned</p>
                      ) : (
                        (juryAssignments[tournament.id] || []).map((jury) => (
                          <div
                            key={jury.juryId}
                            className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/30"
                          >
                            <span className="text-sm text-green-300 font-bold">
                              {jury.username}
                            </span>
                            <button
                              onClick={() =>
                                handleRemoveAssignment(tournament.id, jury.juryId)
                              }
                              className="p-1 hover:bg-red-500/20 transition-all"
                              title="Remove jury from category"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Continue to Bracket Button */}
            <button
              onClick={() => {
                if (tournaments.length > 0) {
                  navigate(`/admin/${eventSlug}/${tournaments[0].category}`);
                }
              }}
              className="w-full mt-8 bg-white/10 hover:bg-white/20 border border-white/10 text-white px-4 py-3 font-bold uppercase flex items-center justify-center gap-2 transition-all"
            >
              Continue to Bracket
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

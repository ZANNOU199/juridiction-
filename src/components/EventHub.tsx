import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  ArrowRight,
  Shield,
  Lock,
  Monitor,
  Home,
  Trash2,
  Users,
  Share2,
  Copy,
  ExternalLink,
} from "lucide-react";

interface Event {
  id: string;
  eventName: string;
  eventSlug: string;
  eventLogo: string;
  tournaments: Array<{ id: string; category: string }>;
}

export function AdminHub() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [newEventLogo, setNewEventLogo] = useState("");
  const [newCategory, setNewCategory] = useState("B-BOY");
  const [shareMenuOpen, setShareMenuOpen] = useState<string | null>(null);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);
  const [logoUploading, setLogoUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/events");
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        }
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    try {
      const res = await fetch("/api/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: newEventName,
          eventLogo: newEventLogo,
          category: newCategory,
        }),
      });

      if (res.ok) {
        const tournament = await res.json();
        const eventSlug = newEventName
          .toLowerCase()
          .replace(/\s+/g, "")
          .replace(/[^a-z0-9]/g, "");

        setEvents([
          ...events,
          {
            id: tournament.eventId || "new",
            eventName: newEventName,
            eventSlug,
            eventLogo: newEventLogo,
            tournaments: [{ id: tournament.id, category: newCategory }],
          },
        ]);
        setNewEventName("");
        setNewEventLogo("");
        setNewCategory("B-BOY");
        setShowCreateForm(false);
        navigate(`/admin/${eventSlug}/jury-manager`);
      }
    } catch (error) {
      console.error("Failed to create event:", error);
    }
  };

  const handleLogoUpload = async (file: File) => {
    try {
      setLogoUploading(true);
      setLogoUploadProgress(0);

      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setLogoUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          setLogoUploadProgress(100);
          setTimeout(() => {
            setLogoUploading(false);
            setLogoUploadProgress(0);
          }, 500);
          setNewEventLogo(data.url);
        } else {
          console.error("Upload failed:", xhr.statusText);
          setLogoUploading(false);
        }
      });

      xhr.addEventListener("error", () => {
        console.error("Error uploading file");
        setLogoUploading(false);
      });

      xhr.open("POST", "/api/upload");
      xhr.send(formData);
    } catch (error) {
      console.error("Error uploading logo:", error);
      setLogoUploading(false);
    }
  };

  const handleDeleteEvent = async (eventSlug: string) => {
    if (!confirm(`Are you sure you want to delete this event and all its categories?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/${eventSlug}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setEvents(events.filter(e => e.eventSlug !== eventSlug));
      } else {
        alert("Failed to delete event");
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert("Error deleting event");
    }
  };

  const handleDeleteCategory = async (eventSlug: string, category: string) => {
    if (!confirm(`Are you sure you want to delete the ${category} category?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/${eventSlug}/${category}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setEvents(events.map(event => {
          if (event.eventSlug === eventSlug) {
            return {
              ...event,
              tournaments: event.tournaments.filter(t => t.category !== category),
            };
          }
          return event;
        }));
      } else {
        alert("Failed to delete category");
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
      alert("Error deleting category");
    }
  };

  const handleShareLink = (eventSlug: string, category: string, type: "jury" | "public" | "bracket" | "wait" | "ranking") => {
    let path = "";
    switch (type) {
      case "jury":
        path = `/jury/${eventSlug}/${category}`;
        break;
      case "public":
        path = `/${eventSlug}/${category}`;
        break;
      case "bracket":
        path = `/bracket/${eventSlug}/${category}`;
        break;
      case "wait":
        path = `/attente/${eventSlug}/${category}`;
        break;
      case "ranking":
        path = `/publicclassement/${eventSlug}/${category}`;
        break;
    }

    const fullUrl = `${window.location.origin}${path}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(fullUrl);
    
    // Open the page
    window.open(path, "_blank");
    
    // Close the menu
    setShareMenuOpen(null);
  };

  return (
    <div className="min-h-screen bg-surface-dark bg-[radial-gradient(circle_at_50%_50%,_rgba(30,41,59,0.2)_0%,_rgba(5,5,5,1)_100%)] p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors"
          >
            <Home className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Back</span>
          </button>
          <h1 className="text-4xl font-black italic text-white uppercase">
            Event Management
          </h1>
          <div className="w-24" /> {/* Balance grid */}
        </div>
      </div>

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-white/10 border-t-white rounded-full mx-auto" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {events.map((event) => (
              <div
                key={event.id}
                className="group bg-white/5 border border-white/10 hover:border-white/30 p-6 transition-all relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-black italic text-white uppercase">
                    {event.eventName}
                  </h3>
                  <button
                    onClick={() => handleDeleteEvent(event.eventSlug)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                    title="Delete event"
                  >
                    <Trash2 className="w-5 h-5 text-red-400 hover:text-red-300" />
                  </button>
                </div>

                {event.tournaments.length > 0 ? (
                  <div className="space-y-2 mb-6">
                    <p className="text-[10px] font-bold text-white/40 uppercase">
                      Categories
                    </p>
                    {event.tournaments.map((tournament) => (
                      <div
                        key={tournament.id}
                        className="flex items-center justify-between group/cat"
                      >
                        <div className="text-sm text-white/70">
                          • {tournament.category}
                        </div>
                        <button
                          onClick={() => handleDeleteCategory(event.eventSlug, tournament.category)}
                          className="opacity-0 group-hover/cat:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                          title={`Delete ${tournament.category} category`}
                        >
                          <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-2 relative">
                  <button
                    onClick={() =>
                      navigate(
                        `/admin/${event.eventSlug}/jury-manager`
                      )
                    }
                    className="w-full bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/30 hover:border-blue-500/50 px-4 py-2 text-blue-300 text-sm font-bold uppercase flex items-center justify-center gap-2 transition-all"
                  >
                    <Users className="w-4 h-4" />
                    Manage Jury
                  </button>

                  <button
                    onClick={() =>
                      navigate(`/admin/${event.eventSlug}/preselection`)
                    }
                    className="w-full bg-red-600/30 hover:bg-red-600/50 border border-red-500/30 hover:border-red-500/50 px-4 py-2 text-red-200 text-sm font-bold uppercase flex items-center justify-center gap-2 transition-all"
                  >
                    <Shield className="w-4 h-4" />
                    Preselection
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        navigate(
                          `/admin/${event.eventSlug}/${event.tournaments[0]?.category || "B-BOY"}`
                        )
                      }
                      className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 px-4 py-2 text-white text-sm font-bold uppercase flex items-center justify-center gap-2 transition-all"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Manage
                    </button>

                    <div className="relative">
                      <button
                        onClick={() =>
                          setShareMenuOpen(shareMenuOpen === event.eventSlug ? null : event.eventSlug)
                        }
                        className="bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 px-3 py-2 text-white text-sm font-bold transition-all"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      {shareMenuOpen === event.eventSlug && event.tournaments[0] && (
                        <div className="absolute right-0 top-full mt-1 bg-black border border-white/20 rounded shadow-xl z-50 min-w-max">
                          <button
                            onClick={() =>
                              handleShareLink(
                                event.eventSlug,
                                event.tournaments[0].category,
                                "jury"
                              )
                            }
                            className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2 text-white border-b border-white/10 last:border-b-0"
                          >
                            <Copy className="w-3 h-3" />
                            Envoyer au Jury
                          </button>
                          <button
                            onClick={() =>
                              handleShareLink(
                                event.eventSlug,
                                event.tournaments[0].category,
                                "public"
                              )
                            }
                            className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2 text-white border-b border-white/10 last:border-b-0"
                          >
                            <Copy className="w-3 h-3" />
                            Vue Publique
                          </button>
                          <button
                            onClick={() =>
                              handleShareLink(
                                event.eventSlug,
                                event.tournaments[0].category,
                                "bracket"
                              )
                            }
                            className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2 text-white border-b border-white/10 last:border-b-0"
                          >
                            <Copy className="w-3 h-3" />
                            Bracket
                          </button>
                          <button
                            onClick={() =>
                              handleShareLink(
                                event.eventSlug,
                                event.tournaments[0].category,
                                "wait"
                              )
                            }
                            className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2 text-white border-b border-white/10"
                          >
                            <Copy className="w-3 h-3" />
                            Écran d'Attente
                          </button>
                          <button
                            onClick={() =>
                              handleShareLink(
                                event.eventSlug,
                                event.tournaments[0].category,
                                "ranking"
                              )
                            }
                            className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2 text-white"
                          >
                            <Copy className="w-3 h-3" />
                            Classement Public
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Create New Event Card */}
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="group bg-white/5 border border-white/10 hover:border-white/30 p-6 transition-all flex flex-col items-center justify-center gap-4 min-h-[200px]"
            >
              <Plus className="w-12 h-12 text-white/40 group-hover:text-white transition-colors" />
              <span className="text-sm font-bold uppercase text-white/60 group-hover:text-white">
                Create New Event
              </span>
            </button>
          </div>
        )}

        {/* Create Event Form */}
        {showCreateForm && (
          <div className="max-w-md mx-auto bg-white/5 border border-white/10 p-8">
            <h2 className="text-xl font-black italic text-white uppercase mb-6">
              Create Event
            </h2>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wider mb-2">
                  Event Name
                </label>
                <input
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  placeholder="e.g. Systeme de Juridiction 2026"
                  className="w-full bg-white/5 border border-white/10 text-white px-4 py-2 placeholder-white/20 focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wider mb-2">
                  Logo URL (optionnel)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newEventLogo}
                    onChange={(e) => setNewEventLogo(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 bg-white/5 border border-white/10 text-white px-4 py-2 placeholder-white/20 focus:outline-none focus:border-white/30"
                  />
                  <label
                    className={`px-4 py-2 font-bold uppercase cursor-pointer transition-all ${
                      logoUploading
                        ? "bg-white/30 text-white/50 cursor-not-allowed"
                        : "bg-[#d35f17] text-white hover:bg-[#c94e0c]"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleLogoUpload(file);
                        }
                      }}
                      disabled={logoUploading}
                      className="hidden"
                    />
                    {logoUploading ? `${Math.round(logoUploadProgress)}%` : "Upload"}
                  </label>
                </div>
                {logoUploading && (
                  <div className="mt-2 h-1 bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#d35f17] to-[#E11D48] transition-all"
                      style={{ width: `${logoUploadProgress}%` }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wider mb-2">
                  First Category
                </label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. B-BOY"
                  className="w-full bg-white/5 border border-white/10 text-white px-4 py-2 placeholder-white/20 focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-white text-black px-4 py-2 font-bold uppercase hover:bg-white/90 transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-white/10 border border-white/10 text-white px-4 py-2 font-bold uppercase hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      
    </div>
  );
}

export function EventSelector({
  eventSlug,
  category,
  onCategoryChange,
}: {
  eventSlug: string;
  category: string;
  onCategoryChange: (cat: string) => void;
}) {
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventSlug}`);
        if (res.ok) {
          setEvent(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch event:", error);
      }
    };

    fetchEvent();
  }, [eventSlug]);

  if (!event || event.tournaments.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold text-white/40 uppercase">
        Category:
      </span>
      {event.tournaments.length > 1 ? (
        <select
          value={category}
          onChange={(e) => {
            onCategoryChange(e.target.value);
          }}
          className="bg-white/10 border border-white/10 text-white text-sm px-3 py-1 focus:outline-none focus:border-white/30"
        >
          {event.tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.category}>
              {tournament.category}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-white font-bold">{category}</span>
      )}
    </div>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { Trophy, Users } from "lucide-react";

export interface Participant {
  id: string;
  name: string;
  photo: string;
  countryCode?: string;
  countryName?: string;
  countryFlag?: string;
  countryCode2?: string;
  countryName2?: string;
  countryFlag2?: string;
}

export interface Match {
  id: string;
  redTeamId: string;
  blueTeamId: string;
  greenTeamId?: string;
  redVotes: number;
  blueVotes: number;
  greenVotes?: number;
  winnerId: string | null;
  status: "pending" | "active" | "finished";
  allVotesCastAt?: number;
  round: string;
  votingMode: "match" | "round";
  roundCount: number;
  currentRound: number;
  roundResults: { red: number; blue: number; green?: number }[];
  finishedJuries: string[];
  revealed?: boolean;
  isTieBrek?: boolean;
}

export interface TournamentState {
  competitionName: string;
  competitionLogo: string;
  participants: Participant[];
  juryAccounts: Array<{ id: string; username: string; password: string }>;
  juryCount: number;
  currentMatchId: string | null;
  matches: Match[];
  juryVotes: Record<string, "red" | "blue" | "green" | "tie" | null>;
  warnedJuries: string[];
  configured: boolean;
  tournamentSize: 16 | 8 | 4 | 2;
  currentCategory?: string;
}

function DancerPhoto({
  photoUrl,
  className = "w-full h-full object-cover",
  alt = "Dancer",
}: {
  photoUrl?: string;
  className?: string;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [cachedSrc, setCachedSrc] = useState<string | null>(null);

  const storageKey = photoUrl
    ? `JUGE_IMAGE_CACHE:${encodeURIComponent(photoUrl)}`
    : null;

  useEffect(() => {
    setFailed(false);
    if (!storageKey) {
      setCachedSrc(null);
      return;
    }

    try {
      const stored = window.localStorage.getItem(storageKey);
      setCachedSrc(stored);
    } catch {
      setCachedSrc(null);
    }
  }, [photoUrl, storageKey]);

  useEffect(() => {
    if (!photoUrl || !storageKey) return;
    if (cachedSrc) return;

    let active = true;
    const fetchAndCache = async () => {
      try {
        const response = await fetch(photoUrl, { mode: "cors" });
        if (!response.ok) return;
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (!active) return;
          const result = reader.result;
          if (typeof result !== "string") return;
          try {
            window.localStorage.setItem(storageKey, result);
          } catch {
            // Ignore storage write failures.
          }
          setCachedSrc(result);
        };
        reader.readAsDataURL(blob);
      } catch {
        // Keep using the original URL if fetch or cache fails.
      }
    };

    fetchAndCache();
    return () => {
      active = false;
    };
  }, [photoUrl, storageKey, cachedSrc]);

  const finalClass = className.includes("object-top") ? className : `${className} object-top`;
  const imageSrc = cachedSrc || photoUrl;

  if (!imageSrc || failed) {
    return (
      <svg
        className={`${finalClass} bg-[#1f2937]`}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="100" height="100" fill="#1f2937" />
        <circle cx="50" cy="35" r="18" fill="#000000" />
        <path
          d="M20 84 C 20 60, 30 53, 50 53 C 70 53, 80 60, 80 84 Z"
          fill="#000000"
        />
      </svg>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={finalClass}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

function CountryFlags({
  countryFlag,
  countryName,
  countryFlag2,
  countryName2,
  sizeClass = "h-4 w-6",
}: {
  countryFlag?: string;
  countryName?: string;
  countryFlag2?: string;
  countryName2?: string;
  sizeClass?: string;
}) {
  if (!countryFlag && !countryFlag2) return null;

  return (
    <div className="flex items-center gap-1">
      {countryFlag && (
        <img
          src={countryFlag}
          alt={countryName}
          className={`${sizeClass} object-cover rounded-sm`}
          referrerPolicy="no-referrer"
        />
      )}
      {countryFlag2 && (
        <>
          <div className="h-px w-0.5 bg-white/30" />
          <img
            src={countryFlag2}
            alt={countryName2}
            className={`${sizeClass} object-cover rounded-sm`}
            referrerPolicy="no-referrer"
          />
        </>
      )}
    </div>
  );
}

interface MatchNodeProps {
  match?: Match;
  participants: Participant[];
  className?: string;
  side?: "left" | "right";
  isTop8?: boolean;
  onUpdateMatchTeam?: (
    matchId: string,
    side: "red" | "blue" | "green",
    pId: string,
  ) => void;
  key?: string | number;
}

function MatchNode({
  match,
  participants,
  className = "",
  isTop8,
  onUpdateMatchTeam,
}: MatchNodeProps) {
  const getParticipant = (id: string) => participants.find((p) => p.id === id);
  const red = match ? getParticipant(match.redTeamId) : null;
  const blue = match ? getParticipant(match.blueTeamId) : null;
  const green = match?.greenTeamId ? getParticipant(match.greenTeamId) : null;
  const participantRows = [
    { side: "red" as const, participant: red },
    { side: "blue" as const, participant: blue },
    ...(green ? [{ side: "green" as const, participant: green }] : []),
  ];

  const isWinner = (pId: string) =>
    match?.status === "finished" && match.winnerId === pId;

  const getSideTeamId = (side: "red" | "blue" | "green") =>
    side === "red"
      ? match?.redTeamId
      : side === "blue"
      ? match?.blueTeamId
      : match?.greenTeamId;

  const getSideScore = (side: "red" | "blue" | "green") => {
    if (match?.status !== "finished") return "-";
    if (side === "red") return match.redVotes;
    if (side === "blue") return match.blueVotes;
    return match.greenVotes ?? "-";
  };

  return (
    <div
      className={`bracket-card flex flex-col gap-1 group hover:border-primary/30 min-w-[180px] md:min-w-[240px] ${className} ${match?.status === "active" ? "bracket-card-active" : ""}`}
    >
      {participantRows.map(({ participant: p, side }) => {
        const teamId = getSideTeamId(side);
        const sideScore = getSideScore(side);

        return (
          <div
            key={side}
            className={`flex justify-between items-center ${isTop8 ? "h-14 md:h-20 px-5" : "h-10 md:h-14 px-4"} relative border-b border-white/5 last:border-b-0`}
          >
            <div className="flex items-center gap-3 overflow-hidden w-full">
              {onUpdateMatchTeam && match ? (
                <div className="flex items-center gap-1.5 w-full overflow-hidden">
                  <select
                    value={teamId || ""}
                    onChange={(e) =>
                      onUpdateMatchTeam(match.id, side, e.target.value)
                    }
                    className={`bg-transparent ${isTop8 ? "text-[34px] md:text-[50px]" : "text-[13px] md:text-[18px]"} font-black uppercase italic tracking-tighter outline-none border-b border-white/10 focus:border-primary flex-1 text-white cursor-pointer hover:text-primary transition-colors appearance-none min-w-0`}
                  >
                    <option value="" className="bg-[#0a0807]">
                      -
                    </option>
                    {participants.map((part) => (
                      <option
                        key={part.id}
                        value={part.id}
                        className="bg-[#0a0807]"
                      >
                        {part.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span
                  className={`font-black uppercase italic tracking-tighter truncate flex items-center gap-1.5 ${isTop8 ? "text-[36px] md:text-[54px] leading-[1.05]" : "text-[13px] md:text-[18px]"} ${p ? "text-white" : "text-white/10"} ${p && isWinner(p.id) ? "text-primary" : ""}`}
                >
                  <span>{p?.name || "-"}</span>
                  {(p?.countryFlag || p?.countryFlag2) && (
                    <CountryFlags
                      countryFlag={p?.countryFlag}
                      countryName={p?.countryName}
                      countryFlag2={p?.countryFlag2}
                      countryName2={p?.countryName2}
                      sizeClass={isTop8 ? "w-12 h-8 md:w-12 md:h-8" : "w-4.5 h-3 md:w-5 md:h-3.5"}
                    />
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 md:gap-2 shrink-0 ml-2">
              <span
                className={`font-mono font-black ${isTop8 ? "text-[14px] md:text-[18px]" : "text-[12px] md:text-[15px]"} ${p ? "text-white/40" : "text-white/5"}`}
              >
                {sideScore}
              </span>
            </div>
            {p && isWinner(p.id) && (
              <div className="absolute -left-0.5 md:-left-1 top-1/2 -translate-y-1/2 w-0.5 md:w-1 h-5 md:h-7 bg-primary shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function BracketContent({
  state,
  onUpdateMatchTeam,
}: {
  state: TournamentState;
  onUpdateMatchTeam?: (
    mId: string,
    s: "red" | "blue" | "green",
    pId: string,
  ) => void;
}) {
  const getMatch = (round: string, index: number) => {
    const roundMatches = state.matches.filter((m) => m.round === round);
    return roundMatches[index];
  };

  const getWinner = (match?: Match) =>
    state.participants.find((p) => p.id === match?.winnerId);

  const showTop16 = state.tournamentSize >= 16;
  const showTop8 = state.tournamentSize >= 8;
  const showSemi = state.tournamentSize >= 4;
  const isTop8 = state.tournamentSize === 8;

  return (
    <div className="flex justify-center items-center w-full px-10 md:px-20 py-2 md:py-6 relative gap-8 md:gap-12">
      <div className="flex items-center gap-8 md:gap-12">
        {showTop16 && (
          <div className="flex flex-col gap-10 md:gap-14">
            {[0, 1, 2, 3].map((i) => (
              <MatchNode
                key={`l16-${i}`}
                match={getMatch("TOP 16", i)}
                participants={state.participants}
                isTop8={isTop8}
                onUpdateMatchTeam={onUpdateMatchTeam}
              />
            ))}
          </div>
        )}
        {showTop8 && (
          <div className="flex flex-col gap-40 md:gap-52">
            {[0, 1].map((i) => (
              <MatchNode
                key={`l8-${i}`}
                match={getMatch("TOP 8", i)}
                participants={state.participants}
                isTop8={isTop8}
                onUpdateMatchTeam={onUpdateMatchTeam}
              />
            ))}
          </div>
        )}
        {showSemi && (
          <div className="flex flex-col gap-2">
            <div className="p-4 border border-primary/20 bg-primary/5 rounded-sm relative w-[260px] shadow-[0_0_30px_rgba(255,255,255,0.02)]">
              <span className="absolute -top-3 left-6 text-[10px] font-black text-primary uppercase bg-[#0a0807] px-3 italic tracking-widest border border-primary/20 whitespace-nowrap">
                SEMI-FINAL A
              </span>
              <MatchNode
                match={getMatch("SEMI FINALE", 0)}
                participants={state.participants}
                className="border-none bg-transparent p-0 min-w-0"
                onUpdateMatchTeam={onUpdateMatchTeam}
              />
            </div>
            {getMatch("SEMI FINALE", 0)?.winnerId && (
              <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-yellow-400/60 bg-yellow-400/10 rounded-sm">
                <span className="text-[13px] font-black italic uppercase tracking-wide text-yellow-300">
                  {state.participants.find((p) => p.id === getMatch("SEMI FINALE", 0)?.winnerId)?.name}
                </span>
                <span className="text-primary font-black">→</span>
                <span className="text-[12px] font-bold text-yellow-300 uppercase">FINALE</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-8 px-6 relative z-20 shrink-0">
        <div className="text-center">
          <Trophy
            className="text-primary mx-auto mb-2 animate-pulse drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            size={48}
          />
          <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter text-white leading-[0.8]">
            FINALE
          </h1>
        </div>

        <div className="champion-box w-[260px] h-[380px] p-0.5 flex flex-col relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4 relative z-10">
            <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.05)]">
              {getWinner(getMatch("FINALE", 0)) ? (
                <DancerPhoto
                  photoUrl={getWinner(getMatch("FINALE", 0))?.photo}
                  alt={getWinner(getMatch("FINALE", 0))?.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-white/5">
                  <Users size={48} />
                </div>
              )}
            </div>
            <div className="text-center space-y-2">
              <p className="text-[13px] font-bold text-primary uppercase tracking-[0.3em] italic">
                Champion
              </p>
              <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter truncate w-[220px] drop-shadow-md">
                {getWinner(getMatch("FINALE", 0))?.name || "-"}
              </h2>
            </div>
          </div>
          <div className="h-1.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
        </div>
      </div>

      <div className="flex items-center gap-8 md:gap-12 flex-row-reverse">
        {showTop16 && (
          <div className="flex flex-col gap-10 md:gap-14">
            {[4, 5, 6, 7].map((i) => (
              <MatchNode
                key={`r16-${i}`}
                match={getMatch("TOP 16", i)}
                participants={state.participants}
                isTop8={isTop8}
                onUpdateMatchTeam={onUpdateMatchTeam}
              />
            ))}
          </div>
        )}
        {showTop8 && (
          <div className="flex flex-col gap-40 md:gap-52">
            {[2, 3].map((i) => (
              <MatchNode
                key={`r8-${i}`}
                match={getMatch("TOP 8", i)}
                participants={state.participants}
                isTop8={isTop8}
                onUpdateMatchTeam={onUpdateMatchTeam}
              />
            ))}
          </div>
        )}
        {showSemi && (
          <div className="flex flex-col gap-2">
            <div className="p-4 border border-primary/20 bg-primary/5 rounded-sm relative w-[260px] shadow-[0_0_30px_rgba(255,255,255,0.02)]">
              <span className="absolute -top-3 right-6 text-[10px] font-black text-primary uppercase bg-[#0a0807] px-3 italic tracking-widest border border-primary/20 whitespace-nowrap">
                SEMI-FINAL B
              </span>
              <MatchNode
                match={getMatch("SEMI FINALE", 1)}
                participants={state.participants}
                className="border-none bg-transparent p-0 min-w-0"
                onUpdateMatchTeam={onUpdateMatchTeam}
              />
            </div>
            {getMatch("SEMI FINALE", 1)?.winnerId && (
              <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-yellow-400/60 bg-yellow-400/10 rounded-sm">
                <span className="text-[10px] font-bold text-yellow-300 uppercase">FINALE</span>
                <span className="text-primary font-black">←</span>
                <span className="text-[11px] font-black italic uppercase tracking-wide text-yellow-300">
                  {state.participants.find((p) => p.id === getMatch("SEMI FINALE", 1)?.winnerId)?.name}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function BracketPreview({
  participants,
  matches,
  tournamentSize,
  onUpdateMatchTeam,
}: {
  participants: Participant[];
  matches: Match[];
  tournamentSize: 16 | 8 | 4 | 2;
  onUpdateMatchTeam?: (
    mId: string,
    s: "red" | "blue" | "green",
    pId: string,
  ) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current && measureRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const contentWidth = 2400;
        const scale = (containerWidth - 60) / contentWidth;
        setScale(Math.min(1, scale));
      }
    };

    updateScale();
    const timer = window.setTimeout(updateScale, 200);
    window.addEventListener("resize", updateScale);
    return () => {
      window.removeEventListener("resize", updateScale);
      window.clearTimeout(timer);
    };
  }, [participants, matches, tournamentSize]);

  const state: TournamentState = {
    competitionName: "",
    competitionLogo: "",
    participants,
    juryAccounts: [],
    juryCount: 0,
    currentMatchId: null,
    matches,
    juryVotes: {},
    warnedJuries: [],
    configured: true,
    tournamentSize,
  };

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden py-4 md:py-8">
      <div
        ref={measureRef}
        className="absolute top-0 left-0 invisible pointer-events-none"
        style={{ width: "2400px" }}
      >
        <BracketContent state={state} onUpdateMatchTeam={onUpdateMatchTeam} />
      </div>

      <div
        style={{
          width: "2400px",
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          transition: "transform 0.4s ease-out",
          willChange: "transform",
          flexShrink: 0,
        }}
        className="mx-auto"
      >
        <BracketContent state={state} onUpdateMatchTeam={onUpdateMatchTeam} />
      </div>
    </div>
  );
}

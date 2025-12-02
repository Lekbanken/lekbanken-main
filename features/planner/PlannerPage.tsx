"use client";

import { useState } from "react";
import { PlannerPageLayout } from "./components/PlannerPageLayout";
import { SessionEditor } from "./components/SessionEditor";
import { SessionList } from "./components/SessionList";
import type { GameItem, Session } from "./types";

const initialGames: GameItem[] = [
  { id: "g-1", title: "Bollkull", durationMinutes: 10, energy: "high", environment: "either" },
  { id: "g-2", title: "Samarbetspussel", durationMinutes: 15, energy: "medium", environment: "indoor" },
];

const initialSessions: Session[] = [
  {
    id: "s-1",
    title: "Uppvärmning + Samarbete",
    notes: "Fokus på energi och gruppkontakt.",
    games: initialGames,
    updatedAt: "idag",
  },
];

export function PlannerPage() {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(initialSessions[0]?.id ?? "");

  const handleCreate = () => {
    const newSession: Session = {
      id: `s-${Date.now()}`,
      title: "Ny session",
      notes: "",
      games: [],
      updatedAt: "nyss",
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleUpdate = (session: Session) => {
    setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];

  return (
    <PlannerPageLayout>
      <div className="space-y-6">
        <SessionList 
          sessions={sessions} 
          onCreate={handleCreate}
          activeId={activeSessionId}
          onSelect={setActiveSessionId}
        />
        {activeSession ? (
          <SessionEditor session={activeSession} onUpdate={handleUpdate} />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            Skapa en session för att börja planera.
          </div>
        )}
      </div>
    </PlannerPageLayout>
  );
}

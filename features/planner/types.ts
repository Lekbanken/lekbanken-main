export type GameItem = {
  id: string;
  title: string;
  durationMinutes: number;
  energy?: "low" | "medium" | "high";
  environment?: "indoor" | "outdoor" | "either";
};

export type Session = {
  id: string;
  title: string;
  notes?: string;
  games: GameItem[];
  updatedAt?: string;
};

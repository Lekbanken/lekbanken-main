export type Step = {
  id: string;
  title: string;
  description: string;
  durationMinutes?: number;
  materials?: string[];
  safety?: string;
};

export type GameRun = {
  id: string;
  title: string;
  summary: string;
  steps: Step[];
  environment?: string;
  groupSize?: string;
  ageRange?: string;
};

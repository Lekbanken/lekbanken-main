export type UserSummary = {
  name: string;
  email: string;
  avatarUrl?: string;
  coins?: number;
  achievements?: number;
};

export type SettingsState = {
  language: string;
  notifications: boolean;
};

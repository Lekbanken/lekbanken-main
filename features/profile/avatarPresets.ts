export type AvatarPreset = {
  id: string;
  label: string;
  src: string;
};

const AVATAR_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars`
    : "https://qohhnufxididbmzqnjwg.supabase.co/storage/v1/object/public/avatars");

const url = (file: string) => `${AVATAR_BASE}/${file}`;

export const avatarPresets: AvatarPreset[] = [
  { id: "turqwave", label: "Turqwave", src: url("turqwave_transparent.png") },
  { id: "deepspace", label: "Deepspace", src: url("deepspace_transparent.png") },
  { id: "greenmoss", label: "Greenmoss", src: url("greenmoss_transparent.png") },
  { id: "greygravel", label: "Greygravel", src: url("greygravel_transparent.png") },
  { id: "pinksky", label: "Pinksky", src: url("pinksky_transparent.png") },
  { id: "rainbowheaven", label: "Rainbowheaven", src: url("rainbowheaven_transparent.png") },
  { id: "redmagma", label: "Redmagma", src: url("redmagma_transparent.png") },
];

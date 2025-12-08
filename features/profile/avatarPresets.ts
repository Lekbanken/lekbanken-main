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
  { id: "turqwave", label: "Turqwave", src: url("turqwave.png") },
  { id: "deepspace", label: "Deepspace", src: url("deepspace.png") },
  { id: "greenmoss", label: "Greenmoss", src: url("greenmoss.png") },
  { id: "greygravel", label: "Greygravel", src: url("greygravel.png") },
  { id: "pinksky", label: "Pinksky", src: url("pinksky.png") },
  { id: "rainbowheaven", label: "Rainbowheaven", src: url("rainbowheaven.png") },
  { id: "redmagma", label: "Redmagma", src: url("redmagma.png") },
];

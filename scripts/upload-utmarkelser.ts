import fs from "fs/promises";
import path from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

const sizeFolders: Record<"sm" | "md" | "lg", string> = {
  sm: "SM - 128x128",
  md: "MD - 256",
  lg: "LG - 512x512",
};

const ROOT = process.env.ASSET_SOURCE_ROOT || "C:\\Users\\infen\\.codex\\Utmärkelser";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "custom_utmarkelser";

async function uploadFile(
  client: SupabaseClient<Database>,
  sizeKey: string,
  fileName: string,
  filePath: string,
) {
  const fileBuffer = await fs.readFile(filePath);
  const destPath = `${sizeKey}/${fileName}`;

  const { error } = await client.storage
    .from(BUCKET)
    .upload(destPath, fileBuffer, {
      cacheControl: "31536000",
      upsert: true,
      contentType: "image/png",
    });

  if (error) {
    console.error(`Failed to upload ${destPath}:`, error.message);
  } else {
    console.log(`Uploaded ${destPath}`);
  }
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const client = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  for (const [sizeKey, folderName] of Object.entries(sizeFolders)) {
    const dir = path.join(ROOT, folderName);
    const files = await fs.readdir(dir);
    console.log(`Uploading ${files.length} files for ${sizeKey} from ${dir}`);

    for (const fileName of files) {
      const filePath = path.join(dir, fileName);
      if (path.extname(fileName).toLowerCase() !== ".png") continue;
      await uploadFile(client, sizeKey, fileName, filePath);
    }
  }

  console.log("Upload complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import fs from "fs/promises";
import path from "path";

const sizeFolders: Record<"sm" | "md" | "lg", string> = {
  sm: "SM - 128x128",
  md: "MD - 256",
  lg: "LG - 512x512",
};

const ROOT = process.env.ASSET_SOURCE_ROOT || "C:\\Users\\infen\\.codex\\Utmärkelser";
const DEST_ROOT = path.join(process.cwd(), "public", "achievements", "utmarkelser");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyFileSafe(src: string, dest: string) {
  await ensureDir(path.dirname(dest));
  const buffer = await fs.readFile(src);
  await fs.writeFile(dest, buffer);
}

async function main() {
  for (const [sizeKey, folderName] of Object.entries(sizeFolders)) {
    const srcDir = path.join(ROOT, folderName);
    const destDir = path.join(DEST_ROOT, sizeKey);
    await ensureDir(destDir);
    const files = await fs.readdir(srcDir);
    console.log(`Syncing ${files.length} files for ${sizeKey} from ${srcDir} -> ${destDir}`);

    for (const file of files) {
      if (path.extname(file).toLowerCase() !== ".png") continue;
      const srcPath = path.join(srcDir, file);
      const destPath = path.join(destDir, file);
      await copyFileSafe(srcPath, destPath);
    }
  }
  console.log("Local mirror sync complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

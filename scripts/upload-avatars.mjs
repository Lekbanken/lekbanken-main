#!/usr/bin/env node
// Upload local avatars in public/avatars to Supabase storage bucket "avatars".
// Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from environment.

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'avatars';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const avatarsDir = path.join(__dirname, '..', 'public', 'avatars');

async function ensureBucket() {
  const { data, error } = await supabase.storage.getBucket(BUCKET);
  if (!error && data) return true;
  const { error: createError } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (createError && !createError.message.includes('already exists')) {
    throw createError;
  }
  return true;
}

async function uploadAvatar(fileName) {
  const filePath = path.join(avatarsDir, fileName);
  const buffer = fs.readFileSync(filePath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, { contentType: 'image/png', upsert: true });
  if (error) throw error;
}

async function main() {
  if (!fs.existsSync(avatarsDir)) {
    console.error(`Avatar folder not found: ${avatarsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(avatarsDir).filter((f) => f.toLowerCase().endsWith('.png'));
  if (files.length === 0) {
    console.log('No PNG files found in public/avatars');
    return;
  }

  await ensureBucket();

  for (const file of files) {
    process.stdout.write(`Uploading ${file} ... `);
    await uploadAvatar(file);
    process.stdout.write('done\n');
  }

  console.log('\nDone. Public URLs will be:');
  for (const file of files) {
    console.log(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${file}`);
  }
}

main().catch((err) => {
  console.error('Upload failed:', err.message || err);
  process.exit(1);
});

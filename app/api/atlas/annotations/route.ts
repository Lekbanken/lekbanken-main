/**
 * Atlas Annotations API Route
 *
 * GET: Load annotations from .atlas/annotations.json
 * POST: Save annotations to .atlas/annotations.json
 *
 * This is a dev-only route for local annotation management.
 */

import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const ANNOTATIONS_PATH = join(process.cwd(), '.atlas', 'annotations.json');

export async function GET() {
  try {
    const content = await readFile(ANNOTATIONS_PATH, 'utf-8');
    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch (error) {
    // If file doesn't exist, return empty structure
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({
        version: '1.0',
        lastModified: new Date().toISOString(),
        annotations: {},
      });
    }
    console.error('Failed to read annotations:', error);
    return NextResponse.json(
      { error: 'Failed to read annotations' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  try {
    const data = await request.json();
    
    // Update lastModified timestamp
    data.lastModified = new Date().toISOString();
    
    // Write to file with pretty formatting
    await writeFile(ANNOTATIONS_PATH, JSON.stringify(data, null, 2), 'utf-8');
    
    return NextResponse.json({ success: true, lastModified: data.lastModified });
  } catch (error) {
    console.error('Failed to save annotations:', error);
    return NextResponse.json(
      { error: 'Failed to save annotations' },
      { status: 500 }
    );
  }
}

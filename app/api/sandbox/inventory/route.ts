import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

/**
 * API route to serve inventory.json for Atlas
 * GET /api/sandbox/inventory
 */
export async function GET() {
  try {
    const cwd = process.cwd();
    const inventoryPath = path.join(cwd, 'inventory.json');
    
    // Check if file exists first
    try {
      await fs.access(inventoryPath);
    } catch {
      console.error(`inventory.json not found at: ${inventoryPath}`);
      console.error(`Current working directory: ${cwd}`);
      return NextResponse.json(
        { error: 'inventory.json not found', path: inventoryPath, cwd },
        { status: 404 }
      );
    }
    
    let fileContent = await fs.readFile(inventoryPath, 'utf-8');
    
    // Remove UTF-8 BOM if present (common on Windows)
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }
    
    const data = JSON.parse(fileContent);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to load inventory.json:', error);
    return NextResponse.json(
      { error: 'Failed to load inventory data', message: String(error) },
      { status: 500 }
    );
  }
}

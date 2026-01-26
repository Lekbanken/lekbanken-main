import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Use absolute path construction that works on Windows
    const inventoryPath = path.resolve(process.cwd(), 'inventory.json');
    console.log('[Atlas API] Reading inventory from:', inventoryPath);
    
    let fileContent = await fs.readFile(inventoryPath, 'utf-8');
    
    // Remove BOM (Byte Order Mark) if present - common in Windows UTF-8 files
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
      console.log('[Atlas API] Removed BOM from file');
    }
    
    console.log('[Atlas API] File read successfully, size:', fileContent.length, 'bytes');
    
    const data = JSON.parse(fileContent);
    console.log('[Atlas API] JSON parsed successfully');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Atlas API] Failed to read inventory.json:', error);
    
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json(
        { error: 'inventory.json not found. Run scripts/generate-inventory-v2.ps1 to generate it.' },
        { status: 404 }
      );
    }
    
    // Include more error details for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to read inventory.json: ${errorMessage}` },
      { status: 500 }
    );
  }
}

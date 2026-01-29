import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { InventoryData } from '@/app/sandbox/atlas/lib/inventory-types';

/**
 * Remove BOM (Byte Order Mark) from file content if present.
 * Common in Windows UTF-8 files.
 */
function removeBOM(content: string): string {
  if (content.charCodeAt(0) === 0xFEFF) {
    return content.slice(1);
  }
  return content;
}

interface PartitionManifest {
  version: string;
  generatedAt: string;
  root: string;
  partitions: Record<string, { updatedAt: string; nodeCount?: number; edgeCount?: number }>;
  totals: { nodeCount: number; edgeCount: number; findingCount: number };
}

interface Partition {
  id: string;
  updatedAt: string;
  nodes?: unknown[];
  edges?: unknown[];
  findings?: unknown[];
}

/**
 * Load inventory from partitioned .inventory/ directory or fallback to legacy inventory.json
 * 
 * Query params:
 * - domain: Filter to specific domain (marketing, app, admin, etc.)
 * - partitioned: Set to 'false' to force legacy mode
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');
  const usePartitioned = searchParams.get('partitioned') !== 'false';

  try {
    const inventoryDir = path.resolve(process.cwd(), '.inventory');
    const manifestPath = path.join(inventoryDir, 'manifest.json');

    // Check if partitioned inventory exists
    const hasPartitioned = await fs.access(manifestPath).then(() => true).catch(() => false);

    if (hasPartitioned && usePartitioned) {
      console.log('[Atlas API] Loading from partitioned inventory');
      return await loadPartitionedInventory(inventoryDir, domain);
    } else {
      console.log('[Atlas API] Falling back to legacy inventory.json');
      return await loadLegacyInventory();
    }
  } catch (error) {
    console.error('[Atlas API] Failed to load inventory:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to load inventory: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * Load inventory from partitioned files in .inventory/ directory
 */
async function loadPartitionedInventory(inventoryDir: string, domainFilter: string | null): Promise<NextResponse> {
  const manifestPath = path.join(inventoryDir, 'manifest.json');
  const manifestContent = await fs.readFile(manifestPath, 'utf-8');
  const manifest: PartitionManifest = JSON.parse(removeBOM(manifestContent));

  console.log(`[Atlas API] Manifest loaded: v${manifest.version}, ${Object.keys(manifest.partitions).length} partitions`);

  const allNodes: unknown[] = [];
  const allEdges: unknown[] = [];
  let allFindings: unknown[] = [];

  // Load domain partitions
  const domainsDir = path.join(inventoryDir, 'domains');
  const domainFiles = await fs.readdir(domainsDir).catch(() => [] as string[]);
  
  for (const file of domainFiles) {
    if (!file.endsWith('.json')) continue;
    
    const domainName = file.replace('.json', '');
    
    // Apply domain filter if specified
    if (domainFilter && domainName !== domainFilter) continue;
    
    const partitionPath = path.join(domainsDir, file);
    const content = await fs.readFile(partitionPath, 'utf-8');
    const partition: Partition = JSON.parse(removeBOM(content));
    
    if (partition.nodes) {
      allNodes.push(...partition.nodes);
    }
  }

  // Load database partitions (always, as they're cross-domain)
  const databaseDir = path.join(inventoryDir, 'database');
  const dbFiles = await fs.readdir(databaseDir).catch(() => [] as string[]);
  
  for (const file of dbFiles) {
    if (!file.endsWith('.json')) continue;
    
    const partitionPath = path.join(databaseDir, file);
    const content = await fs.readFile(partitionPath, 'utf-8');
    const partition: Partition = JSON.parse(removeBOM(content));
    
    if (partition.nodes) {
      allNodes.push(...partition.nodes);
    }
  }

  // Load edge partitions
  const edgesDir = path.join(inventoryDir, 'edges');
  const edgeFiles = await fs.readdir(edgesDir).catch(() => [] as string[]);
  
  for (const file of edgeFiles) {
    if (!file.endsWith('.json')) continue;
    
    const partitionPath = path.join(edgesDir, file);
    const content = await fs.readFile(partitionPath, 'utf-8');
    const partition: Partition = JSON.parse(removeBOM(content));
    
    if (partition.edges) {
      allEdges.push(...partition.edges);
    }
  }

  // Load findings
  const findingsPath = path.join(inventoryDir, 'findings.json');
  try {
    const findingsContent = await fs.readFile(findingsPath, 'utf-8');
    const findingsPartition = JSON.parse(removeBOM(findingsContent));
    allFindings = findingsPartition.findings || [];
  } catch {
    // Findings file may not exist
  }

  // Build combined inventory
  const inventory: InventoryData = {
    meta: {
      version: `Partitioned v${manifest.version}`,
      generatedAt: manifest.generatedAt,
      root: manifest.root,
      notes: [
        `Loaded from ${Object.keys(manifest.partitions).length} partitions`,
        domainFilter ? `Filtered to domain: ${domainFilter}` : 'All domains loaded',
      ],
    },
    nodes: allNodes as InventoryData['nodes'],
    edges: allEdges as InventoryData['edges'],
    findings: allFindings as InventoryData['findings'],
    metrics: {
      nodeCount: allNodes.length,
      edgeCount: allEdges.length,
      findingCount: allFindings.length,
    },
  };

  console.log(`[Atlas API] Loaded ${allNodes.length} nodes, ${allEdges.length} edges from partitions`);

  return NextResponse.json(inventory);
}

/**
 * Load inventory from legacy single inventory.json file
 */
async function loadLegacyInventory(): Promise<NextResponse> {
  const inventoryPath = path.resolve(process.cwd(), 'inventory.json');
  console.log('[Atlas API] Reading legacy inventory from:', inventoryPath);

  try {
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
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json(
        { error: 'inventory.json not found. Run scripts/generate-inventory-v3.ps1 to generate it.' },
        { status: 404 }
      );
    }
    throw error;
  }
}

'use client';

import { useState, useMemo } from "react";
import {
  DocumentArrowDownIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  TableCellsIcon,
  DocumentIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
  AdminBreadcrumbs,
} from "@/components/admin/shared";
import { Button, Card, CardContent, Badge, Input, EmptyState, Tabs, TabPanel } from "@/components/ui";

type ExportFormat = "csv" | "json" | "pdf" | "xlsx";
type ExportStatus = "active" | "draft" | "archived";
type ExportLogStatus = "completed" | "pending" | "failed";

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: ExportFormat;
  targetType: string;
  status: ExportStatus;
  version: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ExportLogEntry {
  id: string;
  templateName: string;
  format: ExportFormat;
  status: ExportLogStatus;
  recordCount: number;
  fileSize: string;
  exportedBy: string;
  exportedAt: string;
}

const formatConfig: Record<ExportFormat, { label: string; icon: React.ReactNode; color: string }> = {
  csv: { label: "CSV", icon: <TableCellsIcon className="h-4 w-4" />, color: "text-green-600" },
  json: { label: "JSON", icon: <DocumentTextIcon className="h-4 w-4" />, color: "text-blue-600" },
  pdf: { label: "PDF", icon: <DocumentIcon className="h-4 w-4" />, color: "text-red-600" },
  xlsx: { label: "Excel", icon: <TableCellsIcon className="h-4 w-4" />, color: "text-green-700" },
};

const statusConfig: Record<ExportStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  active: { label: "Aktiv", variant: "default" },
  draft: { label: "Utkast", variant: "secondary" },
  archived: { label: "Arkiverad", variant: "outline" },
};

const logStatusConfig: Record<ExportLogStatus, { label: string; icon: React.ReactNode; color: string }> = {
  completed: { label: "Klar", icon: <CheckCircleIcon className="h-4 w-4" />, color: "text-green-600" },
  pending: { label: "Pågår", icon: <ClockIcon className="h-4 w-4" />, color: "text-yellow-600" },
  failed: { label: "Misslyckad", icon: <ExclamationCircleIcon className="h-4 w-4" />, color: "text-red-600" },
};

// Mock data - empty to show the planned state
const mockTemplates: ExportTemplate[] = [];
const mockLogs: ExportLogEntry[] = [];

type LibraryExportsTab = "templates" | "logs";

export default function LibraryExportsPage() {
  const [activeTab, setActiveTab] = useState<LibraryExportsTab>("templates");
  const [searchQuery, setSearchQuery] = useState("");

  const stats = useMemo(() => ({
    totalTemplates: mockTemplates.length,
    activeTemplates: mockTemplates.filter(t => t.status === "active").length,
    totalExports: mockLogs.length,
    successRate: mockLogs.length > 0 
      ? Math.round((mockLogs.filter(l => l.status === "completed").length / mockLogs.length) * 100)
      : 0,
  }), []);

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Gamification hub", href: "/admin/gamification" },
          { label: "Library Exports" },
        ]}
      />

      <AdminPageHeader
        title="Library Exports"
        description="Exportpaket från biblioteket – CSV, PDF och brandade exports."
        actions={
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            Skapa exportmall
          </Button>
        }
      />

      {/* Stats */}
      <AdminStatGrid cols={4} className="mb-6">
        <AdminStatCard
          label="Exportmallar"
          value={stats.totalTemplates}
          icon={<DocumentArrowDownIcon className="h-5 w-5" />}
          iconColor="primary"
        />
        <AdminStatCard
          label="Aktiva"
          value={stats.activeTemplates}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          iconColor="green"
        />
        <AdminStatCard
          label="Totalt exports"
          value={stats.totalExports}
          icon={<DocumentTextIcon className="h-5 w-5" />}
          iconColor="blue"
        />
        <AdminStatCard
          label="Framgångsgrad"
          value={`${stats.successRate}%`}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          iconColor="green"
        />
      </AdminStatGrid>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as LibraryExportsTab)}
        tabs={[
          { id: "templates", label: "Exportmallar" },
          { id: "logs", label: "Exportlogg" },
        ]}
      />
      <TabPanel id="templates" activeTab={activeTab}>
        <TemplatesTab templates={mockTemplates} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      </TabPanel>
      <TabPanel id="logs" activeTab={activeTab}>
        <LogsTab logs={mockLogs} />
      </TabPanel>
    </AdminPageLayout>
  );
}

// Templates Tab
function TemplatesTab({ 
  templates, 
  searchQuery, 
  setSearchQuery 
}: { 
  templates: ExportTemplate[]; 
  searchQuery: string; 
  setSearchQuery: (q: string) => void;
}) {
  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates;
    const q = searchQuery.toLowerCase();
    return templates.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.description.toLowerCase().includes(q)
    );
  }, [templates, searchQuery]);

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={<DocumentArrowDownIcon className="h-12 w-12" />}
        title="Inga exportmallar ännu"
        description="Skapa din första exportmall för att börja exportera data från biblioteket."
        action={{ label: "Skapa exportmall", onClick: () => {} }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Sök mallar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          Skapa mall
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="cursor-pointer transition-all hover:border-primary hover:shadow-md">
            <CardContent className="p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${formatConfig[template.format].color}`}>
                    {formatConfig[template.format].icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="text-xs text-muted-foreground">v{template.version}</p>
                  </div>
                </div>
                <Badge variant={statusConfig[template.status].variant}>
                  {statusConfig[template.status].label}
                </Badge>
              </div>
              <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{template.description}</p>
              <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">{template.targetType}</span>
                <span className="font-medium">{template.usageCount} exporter</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Logs Tab
function LogsTab({ logs }: { logs: ExportLogEntry[] }) {
  if (logs.length === 0) {
    return (
      <EmptyState
        icon={<ClockIcon className="h-12 w-12" />}
        title="Ingen exporthistorik"
        description="Här visas historik över genomförda exporter."
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Mall</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Format</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Poster</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Storlek</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Exporterad av</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Datum</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{log.templateName}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{formatConfig[log.format].label}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className={`flex items-center gap-1 ${logStatusConfig[log.status].color}`}>
                    {logStatusConfig[log.status].icon}
                    <span>{logStatusConfig[log.status].label}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono">{log.recordCount.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono">{log.fileSize}</td>
                <td className="px-4 py-3 text-muted-foreground">{log.exportedBy}</td>
                <td className="px-4 py-3 text-muted-foreground">{log.exportedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';

const organisationsColumns = ['Namn', 'Plan', 'Status'];

export default function OrganisationsPage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BuildingOffice2Icon className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Organisationer</h1>
          </div>
          <p className="text-muted-foreground">DataTable + TagChip</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Organisationshantering</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Hantera organisationer, licenser och status direkt i admin.</p>
            <div className="flex gap-2">
              {organisationsColumns.map((column) => (
                <Badge key={column} variant="secondary" className="bg-indigo-100 text-indigo-700">
                  {column}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

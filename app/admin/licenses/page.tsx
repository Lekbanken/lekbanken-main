import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { KeyIcon } from '@heroicons/react/24/outline';

const licenseBadges = ['Aktiv', 'Pågående', 'Avslutad'];

export default function LicensesPage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <KeyIcon className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Licenser</h1>
          </div>
          <p className="text-muted-foreground">StatusBadge + Pagination</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Licenshantering</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Licenser kopplas till organisationer och följer samma datatabellsmönster.</p>
            <div className="flex gap-2">
              {licenseBadges.map((badge) => (
                <Badge key={badge} variant="secondary" className="bg-emerald-100 text-emerald-700">
                  {badge}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

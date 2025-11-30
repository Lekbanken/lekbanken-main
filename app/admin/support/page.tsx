import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { LifebuoyIcon } from '@heroicons/react/24/outline';

const tools = ['ConfirmDialog', 'Toast', 'Modal'];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <LifebuoyIcon className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Support</h1>
          </div>
          <p className="text-muted-foreground">Shared utilities</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Supportflöden</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Supportflöden återanvänder delade modaler och notiser för konsekvent UX.</p>
            <div className="flex gap-2">
              {tools.map((tool) => (
                <Badge key={tool} variant="secondary">
                  {tool}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

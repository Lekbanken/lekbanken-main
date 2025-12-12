import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TenantDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Organisations&shy;översikt</h1>
        <p className="mt-1 text-sm text-slate-500">
          Välkommen till din organisations adminpanel
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Medlemmar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="mt-1 text-sm text-slate-500">Totalt antal medlemmar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktiva sessioner</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="mt-1 text-sm text-slate-500">Senaste 30 dagarna</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prenumeration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-primary">Aktiv</p>
            <p className="mt-1 text-sm text-slate-500">Nästa faktura: --</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Snabbåtgärder</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Tenant admin dashboard under utveckling. Funktioner kommer snart.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

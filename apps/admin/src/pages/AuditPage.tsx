import { Card, CardContent } from '@home-services/ui';

export function AuditPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900">Audit Logs</h2>
      <Card className="rounded-lg border-neutral-200">
        <CardContent className="py-12 text-center text-neutral-500">
          Available in backend logs. Configure an audit log endpoint to display here.
        </CardContent>
      </Card>
    </div>
  );
}

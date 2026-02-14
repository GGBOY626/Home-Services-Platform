import { Card, CardContent } from '@home-services/ui';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900">Settings</h2>
      <Card className="rounded-lg border-neutral-200 max-w-md">
        <CardContent className="p-6">
          <p className="text-sm text-neutral-500">RBAC and other settings (Phase 2).</p>
        </CardContent>
      </Card>
    </div>
  );
}

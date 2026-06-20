import { Card, CardContent } from '@home-services/ui';

export function KpiCard({ title, value, icon }: { title: string; value: string | number; icon?: string }) {
  return (
    <Card className="rounded-xl transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium" style={{ color: 'var(--app-text-muted)' }}>{title}</p>
          {icon && <span className="text-2xl">{icon}</span>}
        </div>
        <p className="mt-2 text-3xl font-bold tracking-tight" style={{ color: 'var(--app-primary)' }}>{value}</p>
      </CardContent>
    </Card>
  );
}

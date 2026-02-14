import { Card, CardContent } from '@home-services/ui';

export function KpiCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card className="rounded-xl border-neutral-200">
      <CardContent className="p-5">
        <p className="text-sm font-medium text-neutral-500">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
      </CardContent>
    </Card>
  );
}

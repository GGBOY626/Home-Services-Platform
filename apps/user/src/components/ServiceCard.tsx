import { Card, CardContent } from '@home-services/ui';
import { Button } from '@home-services/ui';

export interface ServiceCardProps {
  title: string;
  subtitle: string;
  icon?: string;
  enabled: boolean;
  ctaLabel: string;
  onCta: () => void;
}

export function ServiceCard({ title, subtitle, icon, enabled, ctaLabel, onCta }: ServiceCardProps) {
  return (
    <Card className="rounded-2xl border-neutral-200 shadow-sm transition hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {icon && <span className="text-3xl">{icon}</span>}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
            <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
            <Button
              size="lg"
              className="mt-4 w-full sm:w-auto"
              onClick={onCta}
              disabled={!enabled}
            >
              {enabled ? ctaLabel : 'Coming soon'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

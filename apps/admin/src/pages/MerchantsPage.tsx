import { Card, CardContent } from '@home-services/ui';

const SEED_MERCHANTS = [
  { id: 'b0000000-0000-0000-0000-000000000001', displayName: 'Demo Cleaning Co', email: 'merchant@demo.com' },
];

export function MerchantsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900">Merchants</h2>
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="px-4 py-3 text-left font-medium text-neutral-700">Display name</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-700">Email</th>
            </tr>
          </thead>
          <tbody>
            {SEED_MERCHANTS.map((m) => (
              <tr key={m.id} className="border-b border-neutral-100">
                <td className="px-4 py-3 text-neutral-900">{m.displayName}</td>
                <td className="px-4 py-3 text-neutral-600">{m.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

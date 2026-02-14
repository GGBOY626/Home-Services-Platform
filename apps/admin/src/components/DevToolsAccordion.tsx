import { useState } from 'react';
import { Button } from '@home-services/ui';

export function DevToolsAccordion({
  onRunTimeoutJob,
  loading,
}: {
  onRunTimeoutJob: () => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium text-neutral-700"
      >
        Dev tools
        <span className="text-neutral-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-t border-neutral-200 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onRunTimeoutJob} disabled={loading}>
            {loading ? 'Running…' : 'Run Timeout Job'}
          </Button>
        </div>
      )}
    </div>
  );
}

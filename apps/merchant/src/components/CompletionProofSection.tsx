import { useEffect, useState } from 'react';
import type { CompletionProof } from '@home-services/shared';

export interface CompletionProofSectionProps {
  orderId: string;
  status: string;
  fetchProof: (orderId: string) => Promise<CompletionProof | null>;
}

export function CompletionProofSection({ orderId, status, fetchProof }: CompletionProofSectionProps) {
  const [proof, setProof] = useState<CompletionProof | null>(null);

  useEffect(() => {
    if (status !== 'COMPLETED' && status !== 'CLOSED') return;
    fetchProof(orderId).then(setProof);
  }, [orderId, status, fetchProof]);

  if (!proof) return null;

  return (
    <div className="pt-4 border-t border-neutral-200">
      <p className="text-sm font-medium text-neutral-700 mb-2">Completion proof</p>
      <p className="text-neutral-600 text-sm whitespace-pre-wrap">{proof.completionNotes}</p>
      {proof.attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {proof.attachments.map((a, idx) => (
            <a
              key={idx}
              href={a.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              {a.label ? `[${a.label}] ` : ''}{a.fileName}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

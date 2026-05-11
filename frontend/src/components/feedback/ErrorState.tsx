import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/layout/Card';
import { Button } from '@/components/buttons/Button';
import { ApiClientError } from '@/lib/api/client';

interface Props {
  error: unknown;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: Props) {
  const apiErr = error instanceof ApiClientError ? error : null;
  return (
    <Card className="text-center" padded>
      <div className="w-12 h-12 mx-auto mb-4 rounded-md bg-negative/10 text-negative grid place-items-center">
        <AlertTriangle className="w-5 h-5" strokeWidth={1.75} />
      </div>
      {apiErr ? (
        <div className="inline-block px-2.5 py-1 rounded-xs bg-bg-surface-2 text-[11px] font-mono text-text-muted mb-3">
          {apiErr.code}
        </div>
      ) : null}
      <h3 className="font-display text-xl tracking-tight text-text-primary">Something didn't compute</h3>
      <p className="mt-2 text-text-secondary text-[14px] max-w-md mx-auto">
        {apiErr?.message ?? (error instanceof Error ? error.message : 'Unexpected error')}
      </p>
      {onRetry ? (
        <Button variant="primary" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </Card>
  );
}

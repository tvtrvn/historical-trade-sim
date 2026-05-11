import type { ReactNode } from 'react';
import { Card } from '@/components/layout/Card';

interface Props {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, body, action }: Props) {
  return (
    <Card className="text-center max-w-md mx-auto" padded>
      {icon ? (
        <div className="w-12 h-12 mx-auto mb-4 rounded-md bg-bg-surface-2 grid place-items-center text-text-secondary">
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-2xl tracking-tight text-text-primary">{title}</h3>
      <p className="mt-2 text-text-secondary text-[14px]">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </Card>
  );
}

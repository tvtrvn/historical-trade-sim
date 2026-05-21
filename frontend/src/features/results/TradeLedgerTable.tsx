import { useState } from 'react';

import { Card } from '@/components/layout/Card';
import { TickerChip } from '@/components/form/TickerChip';
import { fmt } from '@/lib/formatters';
import type { TradeEvent } from '@/lib/api/types';

const PAGE = 20;

export function TradeLedgerTable({ trades }: { trades: TradeEvent[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(trades.length / PAGE));
  const slice = trades.slice(page * PAGE, page * PAGE + PAGE);

  if (!trades.length) {
    return (
      <Card>
        <div className="py-6 text-center text-text-muted text-body-s">No trades.</div>
      </Card>
    );
  }

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-body-s">
          <thead>
            <tr className="text-text-muted text-micro uppercase tracking-eyebrow border-b border-DEFAULT">
              <Th>Date</Th>
              <Th>Symbol</Th>
              <Th right>Price</Th>
              <Th right>Shares</Th>
              <Th right>Amount</Th>
              <Th>Kind</Th>
            </tr>
          </thead>
          <tbody>
            {slice.map((t, i) => (
              <tr
                key={`${t.date}-${t.symbol}-${i}`}
                className="border-b border-subtle hover:bg-bg-surface-2/40 transition-colors"
              >
                <Td>{fmt.date(t.date)}</Td>
                <Td>
                  <span className="inline-flex items-center gap-2">
                    <TickerChip symbol={t.symbol} />
                    <span className="font-mono">{t.symbol}</span>
                  </span>
                </Td>
                <Td right mono>
                  {fmt.moneyPrecise(t.price)}
                </Td>
                <Td right mono>
                  {Number(t.shares).toFixed(6)}
                </Td>
                <Td right mono>
                  {fmt.moneyPrecise(t.amount)}
                </Td>
                <Td>
                  <span
                    className={`inline-flex items-center px-2 h-6 rounded-xs text-micro font-medium uppercase tracking-wider ${
                      t.kind === 'initial'
                        ? 'bg-aurum/15 text-aurum'
                        : 'bg-brand/15 text-brand'
                    }`}
                  >
                    {t.kind}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 ? (
        <div className="flex items-center justify-between px-5 py-3 border-t border-DEFAULT text-caption text-text-muted">
          <span>
            {page * PAGE + 1}–{Math.min((page + 1) * PAGE, trades.length)} of {trades.length}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 h-7 rounded-xs border border-DEFAULT hover:border-strong disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Prev
            </button>
            <button
              disabled={page === totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="px-3 h-7 rounded-xs border border-DEFAULT hover:border-strong disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`font-medium px-5 py-3 ${right ? 'text-right' : 'text-left'}`}>{children}</th>
  );
}
function Td({
  children,
  right,
  mono,
}: {
  children: React.ReactNode;
  right?: boolean;
  mono?: boolean;
}) {
  return (
    <td
      className={`px-5 py-3 ${right ? 'text-right' : 'text-left'} ${mono ? 'font-mono tabular' : ''}`}
    >
      {children}
    </td>
  );
}

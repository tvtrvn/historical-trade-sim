import { Skeleton } from '@/components/feedback/Skeleton';

export function ResultsSkeleton() {
  return (
    <div className="max-w-[1280px] mx-auto px-6">
      <div className="mt-6 mb-10">
        <Skeleton width="40%" height={20} />
        <div className="mt-4">
          <Skeleton width="55%" height={36} />
        </div>
        <div className="mt-3">
          <Skeleton width="30%" height={14} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-md p-5 border border-DEFAULT bg-bg-surface">
            <Skeleton width={100} height={12} />
            <div className="mt-4">
              <Skeleton height={36} />
            </div>
            <div className="mt-3">
              <Skeleton width={120} height={14} />
            </div>
          </div>
        ))}
      </div>

      <Skeleton height={420} radius="md" />
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton height={300} radius="md" />
        <Skeleton height={300} radius="md" />
      </div>
    </div>
  );
}

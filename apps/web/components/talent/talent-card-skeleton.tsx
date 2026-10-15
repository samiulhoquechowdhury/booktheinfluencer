import { Skeleton } from '@repo/ui/skeleton';

export function TalentCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[4/5] w-full rounded-xl" />
      <Skeleton className="mt-4 h-6 w-2/3" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <div className="mt-4 flex justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
    </div>
  );
}

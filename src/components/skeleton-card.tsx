import { Card, CardContent } from "@/components/ui/card";

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="space-y-4 p-6">
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

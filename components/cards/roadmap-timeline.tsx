import { cn } from '@/lib/utils';

interface TimelineStep {
  label: string;
  description?: string;
}

interface RoadmapTimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export function RoadmapTimeline({ steps, className }: RoadmapTimelineProps) {
  return (
    <div className={cn('flex flex-col gap-0', className)}>
      {steps.map((step, index) => (
        <div key={step.label} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5 text-sm font-semibold text-primary">
              {index + 1}
            </div>
            {index < steps.length - 1 && <div className="w-px flex-1 bg-border" />}
          </div>
          <div className="pb-8">
            <h3 className="text-base font-semibold">{step.label}</h3>
            {step.description && (
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

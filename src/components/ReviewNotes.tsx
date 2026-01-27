import { AlertCircle, Info, AlertTriangle, HelpCircle } from 'lucide-react';
import { ReviewNote } from '@/types/product';
import { cn } from '@/lib/utils';

interface ReviewNotesProps {
  notes: ReviewNote[];
}

const noteConfig = {
  source: {
    icon: Info,
    className: 'bg-primary/5 border-primary/20 text-primary',
    label: 'Source',
  },
  estimate: {
    icon: AlertTriangle,
    className: 'bg-warning/5 border-warning/20 text-warning',
    label: 'Estimated',
  },
  assumption: {
    icon: HelpCircle,
    className: 'bg-muted border-border text-muted-foreground',
    label: 'Assumed',
  },
  missing: {
    icon: AlertCircle,
    className: 'bg-destructive/5 border-destructive/20 text-destructive',
    label: 'Missing',
  },
};

export const ReviewNotes = ({ notes }: ReviewNotesProps) => {
  if (notes.length === 0) return null;

  const groupedNotes = notes.reduce((acc, note) => {
    if (!acc[note.type]) {
      acc[note.type] = [];
    }
    acc[note.type].push(note);
    return acc;
  }, {} as Record<string, ReviewNote[]>);

  return (
    <div className="space-y-4">
      <h3 className="section-title flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-muted-foreground" />
        Review Notes
      </h3>
      <p className="text-sm text-muted-foreground">
        Please review these notes before importing. Some data may require verification.
      </p>

      <div className="space-y-3">
        {Object.entries(groupedNotes).map(([type, typeNotes]) => {
          const config = noteConfig[type as keyof typeof noteConfig];
          const Icon = config.icon;

          return (
            <div
              key={type}
              className={cn(
                "rounded-lg border p-4",
                config.className
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" />
                <span className="font-medium text-sm">{config.label}</span>
                <span className="text-xs opacity-70">
                  ({typeNotes.length} {typeNotes.length === 1 ? 'item' : 'items'})
                </span>
              </div>
              <ul className="space-y-1.5">
                {typeNotes.map((note, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <span className="opacity-50">•</span>
                    <span>
                      {note.field && (
                        <span className="font-mono text-xs bg-black/5 px-1.5 py-0.5 rounded mr-2">
                          {note.field}
                        </span>
                      )}
                      {note.message}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

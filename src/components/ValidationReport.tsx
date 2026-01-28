import { AlertCircle, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { ValidationResult, groupErrorsByCategory } from '@/lib/validation/productValidation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ValidationReportProps {
  result: ValidationResult;
  compact?: boolean;
}

const categoryLabels: Record<string, string> = {
  title: 'Product Title',
  sku: 'SKU',
  category: 'Category',
  images: 'Images',
  pricing: 'Pricing',
  moq: 'MOQ',
  specifications: 'Specifications',
  logistics: 'Logistics',
  review_notes: 'Review Notes',
};

const categoryIcons: Record<string, string> = {
  title: '📝',
  sku: '🏷️',
  category: '📁',
  images: '🖼️',
  pricing: '💰',
  moq: '📦',
  specifications: '📋',
  logistics: '🚚',
  review_notes: '📌',
};

export const ValidationReport = ({ result, compact = false }: ValidationReportProps) => {
  const groupedErrors = groupErrorsByCategory(result.errors);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {result.isValid ? (
          <>
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-sm text-success">Ready to import</span>
            {result.warnings.length > 0 && (
              <Badge variant="outline" className="text-warning border-warning/30">
                {result.warnings.length} warning{result.warnings.length > 1 ? 's' : ''}
              </Badge>
            )}
          </>
        ) : (
          <>
            <XCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive">
              {result.errors.length} error{result.errors.length > 1 ? 's' : ''} to fix
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border",
          result.isValid
            ? "bg-success/5 border-success/20"
            : "bg-destructive/5 border-destructive/20"
        )}
      >
        {result.isValid ? (
          <CheckCircle className="w-5 h-5 text-success" />
        ) : (
          <XCircle className="w-5 h-5 text-destructive" />
        )}
        <div>
          <p className={cn("font-medium", result.isValid ? "text-success" : "text-destructive")}>
            {result.isValid ? 'Validation Passed' : 'Validation Failed'}
          </p>
          <p className="text-xs text-muted-foreground">
            {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}, {result.warnings.length} warning{result.warnings.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Errors by Category */}
      {result.errors.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-destructive flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Required Fixes
          </h4>
          {Object.entries(groupedErrors).map(([category, errors]) => (
            <div
              key={category}
              className="bg-destructive/5 border border-destructive/20 rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span>{categoryIcons[category] || '⚠️'}</span>
                <span className="font-medium text-sm">{categoryLabels[category] || category}</span>
                <Badge variant="destructive" className="text-xs">
                  {errors.length}
                </Badge>
              </div>
              <ul className="space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm text-destructive/80 flex items-start gap-2">
                    <span className="opacity-50">•</span>
                    <span>{error.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-warning flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Recommendations
          </h4>
          <div className="bg-warning/5 border border-warning/20 rounded-lg p-3">
            <ul className="space-y-1.5">
              {result.warnings.map((warning, index) => (
                <li key={index} className="text-sm text-warning/80 flex items-start gap-2">
                  <span className="opacity-50">•</span>
                  <span>
                    <span className="font-mono text-xs bg-warning/10 px-1 py-0.5 rounded mr-1.5">
                      {warning.field.split('.').pop()}
                    </span>
                    {warning.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Success state with no warnings */}
      {result.isValid && result.warnings.length === 0 && (
        <div className="text-center py-4">
          <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            All Transeo Africa product requirements are met
          </p>
        </div>
      )}
    </div>
  );
};

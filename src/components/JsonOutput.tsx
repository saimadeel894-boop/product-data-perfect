import { useState } from 'react';
import { Copy, Check, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductData } from '@/types/product';
import { cn } from '@/lib/utils';

interface JsonOutputProps {
  data: ProductData;
}

export const JsonOutput = ({ data }: JsonOutputProps) => {
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['all'])
  );

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.sku || 'product'}-data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const renderValue = (value: unknown, depth = 0): React.ReactNode => {
    if (value === null) {
      return <span className="text-muted-foreground">null</span>;
    }
    if (typeof value === 'boolean') {
      return <span className="text-warning">{value.toString()}</span>;
    }
    if (typeof value === 'number') {
      return <span className="text-success">{value}</span>;
    }
    if (typeof value === 'string') {
      return <span className="text-primary">"{value}"</span>;
    }
    return null;
  };

  const renderObject = (obj: Record<string, unknown>, parentKey = '', depth = 0): React.ReactNode => {
    return Object.entries(obj).map(([key, value], index) => {
      const fullKey = parentKey ? `${parentKey}.${key}` : key;
      const isObject = typeof value === 'object' && value !== null;
      const isArray = Array.isArray(value);
      const isExpanded = expandedSections.has('all') || expandedSections.has(fullKey);

      return (
        <div key={fullKey} className={cn("pl-4", depth === 0 && "pl-0")}>
          <div className="flex items-start gap-1 py-0.5">
            {isObject && (
              <button
                onClick={() => toggleSection(fullKey)}
                className="flex-shrink-0 mt-0.5 text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            )}
            {!isObject && <span className="w-3" />}
            <span className="text-foreground font-medium">"{key}"</span>
            <span className="text-muted-foreground">:</span>
            {!isObject && <span className="ml-1">{renderValue(value)}</span>}
            {isObject && !isExpanded && (
              <span className="ml-1 text-muted-foreground">
                {isArray ? `[${(value as unknown[]).length} items]` : '{...}'}
              </span>
            )}
          </div>
          {isObject && isExpanded && (
            <div className="border-l border-border ml-1.5">
              {isArray
                ? (value as unknown[]).map((item, i) => (
                    <div key={i} className="pl-4 py-0.5">
                      {typeof item === 'object' && item !== null ? (
                        renderObject(item as Record<string, unknown>, `${fullKey}[${i}]`, depth + 1)
                      ) : (
                        <span>{renderValue(item)}</span>
                      )}
                    </div>
                  ))
                : renderObject(value as Record<string, unknown>, fullKey, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy JSON
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="w-4 h-4" />
          Download
        </Button>
      </div>

      {/* JSON Display */}
      <div className="json-output max-h-[600px] overflow-auto">
        <div className="text-muted-foreground">{'{'}</div>
        {renderObject(data as unknown as Record<string, unknown>)}
        <div className="text-muted-foreground">{'}'}</div>
      </div>
    </div>
  );
};

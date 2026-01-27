import { useState } from 'react';
import { Upload, Check, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductData } from '@/types/product';
import { wooCommerceApi, WooCommerceImportResult } from '@/lib/api/woocommerce';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ImportButtonProps {
  productData: ProductData;
}

export const ImportButton = ({ productData }: ImportButtonProps) => {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<WooCommerceImportResult | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    setIsImporting(true);
    setResult(null);

    try {
      const importResult = await wooCommerceApi.importProduct(productData);
      setResult(importResult);
      setShowDialog(true);

      if (importResult.success) {
        toast({
          title: 'Import Successful',
          description: importResult.message,
        });
      } else {
        toast({
          title: 'Import Failed',
          description: importResult.error || 'Unknown error occurred',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import product';
      setResult({ success: false, error: errorMessage });
      setShowDialog(true);
      toast({
        title: 'Import Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleImport}
        disabled={isImporting}
        className="gap-2"
        size="lg"
      >
        {isImporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Importing to WooCommerce...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Import to WooCommerce
          </>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {result?.success ? (
                <>
                  <Check className="w-5 h-5 text-success" />
                  Import Successful
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  Import Failed
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {result?.success 
                ? `Product "${productData.product_title}" has been imported as a draft.`
                : result?.error || 'An error occurred during import.'
              }
            </DialogDescription>
          </DialogHeader>

          {result?.success && (
            <div className="space-y-3">
              <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Product ID</span>
                  <span className="font-mono text-sm">{result.product_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm font-medium text-warning">Draft</span>
                </div>
              </div>

              <div className="flex gap-2">
                {result.edit_url && (
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => window.open(result.edit_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Edit in WordPress
                  </Button>
                )}
                {result.product_url && (
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => window.open(result.product_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Product
                  </Button>
                )}
              </div>
            </div>
          )}

          {!result?.success && result?.details && (
            <div className="bg-destructive/10 rounded-lg p-4">
              <p className="text-sm text-destructive font-mono">
                {typeof result.details === 'string' 
                  ? result.details 
                  : JSON.stringify(result.details, null, 2)
                }
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

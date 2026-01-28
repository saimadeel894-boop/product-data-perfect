import { useState, useMemo } from 'react';
import { Upload, CheckCircle, XCircle, ExternalLink, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductData } from '@/types/product';
import { wooCommerceApi, WooCommerceImportResult } from '@/lib/api/woocommerce';
import { validateProduct, ValidationResult } from '@/lib/validation/productValidation';
import { ValidationReport } from '@/components/ValidationReport';

interface ImportButtonProps {
  productData: ProductData;
}

type ImportState = 'idle' | 'validating' | 'importing' | 'success' | 'error';

export const ImportButton = ({ productData }: ImportButtonProps) => {
  const [state, setState] = useState<ImportState>('idle');
  const [result, setResult] = useState<WooCommerceImportResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'validation' | 'result'>('validation');

  // Memoize validation result
  const validationResult = useMemo<ValidationResult>(() => {
    return validateProduct(productData);
  }, [productData]);

  const handleImport = async () => {
    if (!validationResult.isValid) {
      setDialogOpen(true);
      setActiveTab('validation');
      return;
    }

    setState('importing');
    setDialogOpen(true);
    setActiveTab('result');

    try {
      const importResult = await wooCommerceApi.importProduct(productData);
      setResult(importResult);
      setState(importResult.success ? 'success' : 'error');
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
      setState('error');
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    if (state !== 'importing') {
      setState('idle');
      setResult(null);
    }
  };

  const handleValidateClick = () => {
    setDialogOpen(true);
    setActiveTab('validation');
  };

  const handleProceedWithWarnings = async () => {
    setState('importing');
    setActiveTab('result');

    try {
      const importResult = await wooCommerceApi.importProduct(productData);
      setResult(importResult);
      setState(importResult.success ? 'success' : 'error');
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
      setState('error');
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Validation Status Indicator */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleValidateClick}
          className="gap-2"
        >
          {validationResult.isValid ? (
            validationResult.warnings.length > 0 ? (
              <>
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="text-warning text-xs">
                  {validationResult.warnings.length} warning{validationResult.warnings.length > 1 ? 's' : ''}
                </span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-success" />
                <span className="text-success text-xs">Valid</span>
              </>
            )
          ) : (
            <>
              <XCircle className="w-4 h-4 text-destructive" />
              <span className="text-destructive text-xs">
                {validationResult.errors.length} error{validationResult.errors.length > 1 ? 's' : ''}
              </span>
            </>
          )}
        </Button>

        {/* Import Button */}
        <Button
          onClick={handleImport}
          disabled={state === 'importing'}
          className="gap-2"
          variant={validationResult.isValid ? 'default' : 'outline'}
        >
          <Upload className="w-4 h-4" />
          {state === 'importing' ? 'Importing...' : 'Import to WooCommerce'}
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {state === 'importing' && 'Importing Product...'}
              {state === 'success' && 'Import Successful'}
              {state === 'error' && 'Import Failed'}
              {(state === 'idle' || state === 'validating') && 'Product Validation'}
            </DialogTitle>
            <DialogDescription>
              {state === 'importing' && 'Please wait while we import your product to WooCommerce.'}
              {state === 'success' && 'Your product has been imported as a draft.'}
              {state === 'error' && 'There was an error importing your product.'}
              {(state === 'idle' || state === 'validating') && 'Review validation results before importing.'}
            </DialogDescription>
          </DialogHeader>

          {(state === 'idle' || state === 'validating') && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'validation' | 'result')}>
              <TabsList className="w-full">
                <TabsTrigger value="validation" className="flex-1">
                  Validation Report
                </TabsTrigger>
              </TabsList>

              <TabsContent value="validation" className="mt-4">
                <ValidationReport result={validationResult} />

                {validationResult.isValid && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button
                      onClick={handleProceedWithWarnings}
                      className="w-full gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {validationResult.warnings.length > 0
                        ? 'Proceed with Import (Warnings Acknowledged)'
                        : 'Import to WooCommerce'
                      }
                    </Button>
                  </div>
                )}

                {!validationResult.isValid && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground text-center">
                      Fix the errors above before importing
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          {state === 'importing' && (
            <div className="flex flex-col items-center py-8">
              <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">
                Connecting to WooCommerce REST API...
              </p>
            </div>
          )}

          {state === 'success' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg border border-success/20">
                <CheckCircle className="w-8 h-8 text-success" />
                <div>
                  <p className="font-medium text-success">Product Imported Successfully</p>
                  <p className="text-sm text-muted-foreground">
                    Product ID: {result.product_id}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{result.message}</p>
                <p className="text-xs text-muted-foreground">
                  Status: <span className="font-mono bg-warning/20 text-warning px-1.5 py-0.5 rounded">draft</span>
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                {result.edit_url && (
                  <Button variant="outline" size="sm" asChild className="flex-1 gap-2">
                    <a href={result.edit_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      Edit in WordPress
                    </a>
                  </Button>
                )}
                {result.product_url && (
                  <Button variant="outline" size="sm" asChild className="flex-1 gap-2">
                    <a href={result.product_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      Preview Product
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          {state === 'error' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <XCircle className="w-8 h-8 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Import Failed</p>
                  <p className="text-sm text-muted-foreground">{result.error}</p>
                </div>
              </div>

              {result.code && (
                <div className="text-xs font-mono bg-secondary p-3 rounded">
                  Error Code: {result.code}
                </div>
              )}

              <Button onClick={handleClose} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

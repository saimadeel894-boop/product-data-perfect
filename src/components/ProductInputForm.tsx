import { useState, useCallback } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ProductInputFormProps {
  onSubmit: (productName: string, pdfFile: File | null) => void;
  isLoading: boolean;
}

export const ProductInputForm = ({ onSubmit, isLoading }: ProductInputFormProps) => {
  const [productName, setProductName] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (productName.trim() || pdfFile) {
      onSubmit(productName.trim(), pdfFile);
    }
  };

  const removeFile = () => {
    setPdfFile(null);
  };

  const isValid = productName.trim() || pdfFile;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product Name Input */}
      <div className="space-y-2">
        <label className="input-label">Product Name</label>
        <Input
          type="text"
          placeholder="e.g., Jimmy H8 Flex Cordless Vacuum Cleaner"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          className="h-12 text-base"
        />
        <p className="text-xs text-muted-foreground">
          Enter the brand, model, and key specification for best results
        </p>
      </div>

      {/* PDF Upload */}
      <div className="space-y-2">
        <label className="input-label">Product PDF (Optional)</label>
        
        {pdfFile ? (
          <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg border border-border">
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{pdfFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={removeFile}
              className="flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              "upload-zone",
              isDragging && "upload-zone-active"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="pdf-upload"
            />
            <label htmlFor="pdf-upload" className="cursor-pointer">
              <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground mb-1">
                Drop your PDF here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports product specification sheets and brochures
              </p>
            </label>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full h-12 text-base"
        disabled={!isValid || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing Product Data...
          </>
        ) : (
          'Extract & Structure Data'
        )}
      </Button>
    </form>
  );
};

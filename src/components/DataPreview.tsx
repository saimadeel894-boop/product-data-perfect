import { Package, DollarSign, Truck, FileText, Tag, Building2, Globe, Calendar, Factory, BoxIcon } from 'lucide-react';
import { ProductData } from '@/types/product';

interface DataPreviewProps {
  data: ProductData;
}

export const DataPreview = ({ data }: DataPreviewProps) => {
  const formatPrice = (price: number | null) => {
    if (price === null) return '—';
    return `$${price.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Tag className="w-3 h-3" />
          {data.sku}
        </div>
        <h2 className="text-xl font-semibold text-foreground">{data.product_title}</h2>
        <div className="flex items-center gap-2">
          <span className="status-badge bg-primary/10 text-primary">
            {data.product_type}
          </span>
          <span className="status-badge bg-secondary text-secondary-foreground">
            {data.category}
          </span>
        </div>
      </div>

      {/* Company Info */}
      {data.company_info && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            Company Information
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> Company</p>
              <p className="font-medium">{data.company_info.company_name || '—'}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" /> Country of Origin</p>
              <p className="font-medium">{data.company_info.country_of_origin || '—'}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Year Established</p>
              <p className="font-medium">{data.company_info.year_established || '—'}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Factory className="w-3 h-3" /> Daily Production</p>
              <p className="font-medium">{data.company_info.daily_production || '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Images */}
      {data.images.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            Product Images ({data.images.length})
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {data.images.slice(0, 6).map((url, index) => (
              <div
                key={index}
                className="aspect-square bg-secondary rounded-lg overflow-hidden border border-border"
              >
                <img
                  src={url}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          Pricing (USD)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Cost', value: data.pricing.cost_price },
            { label: 'Supply', value: data.pricing.supply_price },
            { label: 'Wholesale', value: data.pricing.wholesale_price },
            { label: 'Retail', value: data.pricing.retail_price },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-secondary/50 rounded-lg p-3 border border-border"
            >
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-semibold">{formatPrice(item.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Logistics */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Truck className="w-4 h-4 text-muted-foreground" />
          Logistics
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">Manufacturing Time</p>
            <p className="font-medium">{data.logistics.manufacturing_time || '—'}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">Import Certification</p>
            <p className="font-medium">
              {data.logistics.import_certification_required ? 'Required' : 'Not Required'}
            </p>
          </div>
        </div>
        {data.logistics.packaging_details && (
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><BoxIcon className="w-3 h-3" /> Packaging Details</p>
            <p className="font-medium">{data.logistics.packaging_details}</p>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          Product Overview
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {data.descriptions.product_overview}
        </p>
        {data.descriptions.key_highlights.length > 0 && (
          <ul className="space-y-1">
            {data.descriptions.key_highlights.map((highlight, index) => (
              <li key={index} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Specifications */}
      {data.sales_content.key_specifications.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Key Specifications</h3>
          <div className="flex flex-wrap gap-2">
            {data.sales_content.key_specifications.map((spec, index) => (
              <span
                key={index}
                className="text-xs bg-secondary px-2 py-1 rounded-md border border-border"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

import { Package, DollarSign, Truck, FileText, Tag, Building2, Globe, Calendar, Factory, BoxIcon, ShieldCheck, Clock, Users, Layers, Award, Boxes, Wrench } from 'lucide-react';
import { ProductData } from '@/types/product';

interface DataPreviewProps {
  data: ProductData;
}

export const DataPreview = ({ data }: DataPreviewProps) => {
  const formatPrice = (price: number | null) => {
    if (price === null) return '—';
    return `$${price.toFixed(2)}`;
  };

  const formatMoq = (moq: number | null) => {
    if (moq === null) return '—';
    return moq.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* 1-4: Header — product_title, sku, product_type, category */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Tag className="w-3 h-3" />
          {data.sku || '—'}
        </div>
        <h2 className="text-xl font-semibold text-foreground">{data.product_title || '—'}</h2>
        <div className="flex items-center gap-2">
          <span className="status-badge bg-primary/10 text-primary">
            {data.product_type || '—'}
          </span>
          <span className="status-badge bg-secondary text-secondary-foreground">
            {data.category || '—'}
          </span>
        </div>
      </div>

      {/* 5-8: Company Info — company_name, country_of_origin, year_established, daily_production */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          Company Information
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> Company</p>
            <p className="font-medium">{data.company_info?.company_name || '—'}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" /> Country of Origin</p>
            <p className="font-medium">{data.company_info?.country_of_origin || '—'}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Year Established</p>
            <p className="font-medium">{data.company_info?.year_established || '—'}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Factory className="w-3 h-3" /> Daily Production</p>
            <p className="font-medium">{data.company_info?.daily_production || '—'}</p>
          </div>
        </div>
      </div>

      {/* 9: Images */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          Product Images ({data.images?.length || 0})
        </h3>
        {data.images && data.images.length > 0 ? (
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
        ) : (
          <p className="text-sm text-muted-foreground italic">No images available</p>
        )}
      </div>

      {/* 10-13: Pricing — cost_price, supply_price, wholesale_price, retail_price */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          Pricing (USD)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Cost Price', value: data.pricing?.cost_price ?? null },
            { label: 'Supply Price', value: data.pricing?.supply_price ?? null },
            { label: 'Wholesale Price', value: data.pricing?.wholesale_price ?? null },
            { label: 'Retail Price', value: data.pricing?.retail_price ?? null },
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

      {/* 14-19: Supplier & Trade — supplier_name, hs_code, moq, moq_exclusive_importer, moq_distributor, moq_retailer */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          Supplier & Trade
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">Supplier Name</p>
            <p className="font-medium">{data.supplier_trade?.supplier_name || '—'}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">HS Code</p>
            <p className="font-medium font-mono">{data.supplier_trade?.hs_code || '—'}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">Base MOQ</p>
            <p className="font-medium">{formatMoq(data.supplier_trade?.moq ?? null)}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">MOQ Exclusive Importer</p>
            <p className="font-medium">{formatMoq(data.supplier_trade?.moq_exclusive_importer ?? null)}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">MOQ Distributor</p>
            <p className="font-medium">{formatMoq(data.supplier_trade?.moq_distributor ?? null)}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">MOQ Retailer</p>
            <p className="font-medium">{formatMoq(data.supplier_trade?.moq_retailer ?? null)}</p>
          </div>
        </div>
      </div>

      {/* 20-23: Logistics — import_certification_required, import_certification_details, manufacturing_time, packaging_details */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Truck className="w-4 h-4 text-muted-foreground" />
          Logistics
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Import Certification</p>
            <p className="font-medium">
              {data.logistics?.import_certification_required ? 'Required' : 'Not Required'}
            </p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Manufacturing Time</p>
            <p className="font-medium">{data.logistics?.manufacturing_time || '—'}</p>
          </div>
        </div>
        {(data.logistics?.import_certification_details) && (
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">Certification Details</p>
            <p className="font-medium">{data.logistics.import_certification_details}</p>
          </div>
        )}
        {/* Always show certification details field even if empty */}
        {!data.logistics?.import_certification_details && (
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">Certification Details</p>
            <p className="font-medium text-muted-foreground italic">—</p>
          </div>
        )}
        <div className="bg-secondary/50 rounded-lg p-3 border border-border">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><BoxIcon className="w-3 h-3" /> Packaging Details</p>
          <p className="font-medium">{data.logistics?.packaging_details || '—'}</p>
        </div>
      </div>

      {/* 25: Key Specifications */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Wrench className="w-4 h-4 text-muted-foreground" />
          Key Specifications ({data.sales_content?.key_specifications?.length || 0})
        </h3>
        {data.sales_content?.key_specifications && data.sales_content.key_specifications.length > 0 ? (
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
        ) : (
          <p className="text-sm text-muted-foreground italic">No specifications available</p>
        )}
      </div>

      {/* 26: Package Options */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Boxes className="w-4 h-4 text-muted-foreground" />
          Package Options ({data.sales_content?.package_options?.length || 0})
        </h3>
        {data.sales_content?.package_options && data.sales_content.package_options.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.sales_content.package_options.map((option, index) => (
              <span
                key={index}
                className="text-xs bg-secondary px-2 py-1 rounded-md border border-border"
              >
                {option}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No package options</p>
        )}
      </div>

      {/* 27: Applications */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          Applications ({data.sales_content?.applications?.length || 0})
        </h3>
        {data.sales_content?.applications && data.sales_content.applications.length > 0 ? (
          <ul className="space-y-1">
            {data.sales_content.applications.map((app, index) => (
              <li key={index} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{app}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">No applications listed</p>
        )}
      </div>

      {/* 28: Certifications */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Award className="w-4 h-4 text-muted-foreground" />
          Certifications ({data.sales_content?.certifications?.length || 0})
        </h3>
        {data.sales_content?.certifications && data.sales_content.certifications.length > 0 ? (
          <div className="space-y-2">
            {data.sales_content.certifications.map((cert, index) => (
              <div key={index} className="bg-secondary/50 rounded-lg p-3 border border-border">
                <p className="font-medium text-sm">{cert.name}</p>
                {cert.details && <p className="text-xs text-muted-foreground mt-1">{cert.details}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No certifications listed</p>
        )}
      </div>

      {/* 29-30: Descriptions — product_overview, key_highlights */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          Product Overview
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {data.descriptions?.product_overview || '—'}
        </p>
        <h4 className="text-sm font-medium mt-2">Key Highlights ({data.descriptions?.key_highlights?.length || 0})</h4>
        {data.descriptions?.key_highlights && data.descriptions.key_highlights.length > 0 ? (
          <ul className="space-y-1">
            {data.descriptions.key_highlights.map((highlight, index) => (
              <li key={index} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">No highlights available</p>
        )}
      </div>

      {/* Field count summary */}
      <div className="bg-secondary/30 rounded-lg p-3 border border-border">
        <p className="text-xs text-muted-foreground text-center">
          Displaying all 30 predefined fields • Empty fields shown as "—"
        </p>
      </div>
    </div>
  );
};

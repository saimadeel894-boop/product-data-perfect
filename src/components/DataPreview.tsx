import { 
  Package, DollarSign, Truck, FileText, Tag, Building2, Globe, Calendar, Factory, 
  BoxIcon, ShieldCheck, Clock, Users, Layers, Award, Boxes, Wrench, MapPin, Ship,
  FileCheck, Mail, Phone, CreditCard, Fingerprint, ShieldAlert, Eye, BadgeCheck,
  Target, Briefcase, Landmark
} from 'lucide-react';
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
      {/* Header — product_title, sku, product_type, category */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Tag className="w-3 h-3" />
          {data.sku || '—'}
        </div>
        <h2 className="text-xl font-semibold text-foreground">{data.product_title || '—'}</h2>
        <div className="flex items-center gap-2">
          <span className="status-badge bg-primary/10 text-primary">{data.product_type || '—'}</span>
          <span className="status-badge bg-secondary text-secondary-foreground">{data.category || '—'}</span>
        </div>
      </div>

      {/* Product Identity & Description */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          Overview
        </h3>
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">Product Description</h4>
            <p className="text-sm leading-relaxed">{data.descriptions?.product_overview || '—'}</p>
          </div>
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">Product Identity</h4>
            <p className="text-sm leading-relaxed">{data.descriptions?.product_identity || '—'}</p>
          </div>
        </div>
      </div>

      {/* Key Highlights */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Wrench className="w-4 h-4 text-muted-foreground" />
          Key Highlights ({data.descriptions?.key_highlights?.length || 0})
        </h3>
        {data.descriptions?.key_highlights && data.descriptions.key_highlights.length > 0 ? (
          <ul className="space-y-1">
            {data.descriptions.key_highlights.map((h, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">—</p>
        )}
      </div>

      {/* Trust & Assurance */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-muted-foreground" />
          Trust & Assurance
        </h3>
        <p className="text-sm leading-relaxed">{data.descriptions?.trust_assurance || '—'}</p>
      </div>

      {/* Images */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          Product Images ({data.images?.length || 0})
        </h3>
        {data.images && data.images.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {data.images.slice(0, 6).map((url, index) => (
              <div key={index} className="aspect-square bg-secondary rounded-lg overflow-hidden border border-border">
                <img src={url} alt={`Product image ${index + 1}`} className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No images available</p>
        )}
      </div>

      {/* Pricing */}
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
            <div key={item.label} className="bg-secondary/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-semibold">{formatPrice(item.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Supplier & Trade */}
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
            <p className="text-xs text-muted-foreground">MOQ (Importer)</p>
            <p className="font-medium">{formatMoq(data.supplier_trade?.moq_exclusive_importer ?? null)}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">MOQ (Distributor)</p>
            <p className="font-medium">{formatMoq(data.supplier_trade?.moq_distributor ?? null)}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">MOQ (Retailer)</p>
            <p className="font-medium">{formatMoq(data.supplier_trade?.moq_retailer ?? null)}</p>
          </div>
        </div>
      </div>

      {/* Company Profile (Supplier Details) */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          Company Profile
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> Company Name</p>
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
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Briefcase className="w-3 h-3" /> Ownership / Partnerships</p>
            <p className="font-medium">{data.company_info?.ownership_partnerships || '—'}</p>
          </div>
        </div>
      </div>

      {/* Production Capacity */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Factory className="w-4 h-4 text-muted-foreground" />
          Production Capacity
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">Daily Production</p>
            <p className="font-medium">{data.company_info?.daily_production || '—'}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">Annual Output</p>
            <p className="font-medium">{data.company_info?.annual_output || '—'}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">Lines Installed</p>
            <p className="font-medium">{data.company_info?.lines_installed || '—'}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">Major Products</p>
            <p className="font-medium">{data.company_info?.major_products || '—'}</p>
          </div>
        </div>
      </div>

      {/* Certifications & Standards */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-muted-foreground" />
          Certifications & Standards
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">Safety Certificates</p>
            <p className="font-medium">{data.certifications_standards?.safety_certificates || '—'}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">Additional Certifications</p>
            <p className="font-medium">{data.certifications_standards?.additional_certifications || '—'}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">Export Licenses</p>
            <p className="font-medium">{data.certifications_standards?.export_licenses || '—'}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">Traceability Systems</p>
            <p className="font-medium">{data.certifications_standards?.traceability_systems || '—'}</p>
          </div>
        </div>
      </div>

      {/* Clients & Markets */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Target className="w-4 h-4 text-muted-foreground" />
          Clients & Markets
        </h3>
        <div className="space-y-3">
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">Key Clients (Domestic + Export)</p>
            <p className="font-medium">{data.clients_markets?.key_clients || '—'}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">Export Markets</p>
            <p className="font-medium">{data.clients_markets?.export_markets || '—'}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">Government Supply Track Record</p>
            <p className="font-medium">{data.clients_markets?.government_supply_track_record || '—'}</p>
          </div>
        </div>
      </div>

      {/* Contact & Logistics */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          Contact & Logistics
        </h3>
        <div className="space-y-3">
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Factory Address</p>
            <p className="font-medium">{data.contact_logistics?.factory_address || '—'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Ship className="w-3 h-3" /> Nearest Port of Loading</p>
              <p className="font-medium">{data.contact_logistics?.nearest_port_of_loading || '—'}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><FileCheck className="w-3 h-3" /> Export Documentation</p>
              <p className="font-medium">{data.contact_logistics?.export_documentation || '—'}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> Email</p>
              <p className="font-medium">{data.contact_logistics?.email || '—'}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Contact Number</p>
              <p className="font-medium">{data.contact_logistics?.contact_number || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Logistics */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Truck className="w-4 h-4 text-muted-foreground" />
          Logistics & Shipping
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Import Certification</p>
            <p className="font-medium">{data.logistics?.import_certification_required ? 'Required' : 'Not Required'}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Manufacturing Time</p>
            <p className="font-medium">{data.logistics?.manufacturing_time || '—'}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Ship className="w-3 h-3" /> Transit Time</p>
            <p className="font-medium">{data.logistics?.transit_time || '—'}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="w-3 h-3" /> Payment Method</p>
            <p className="font-medium">{data.logistics?.payment_method || '—'}</p>
          </div>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3 border border-border">
          <p className="text-xs text-muted-foreground">Certification Details</p>
          <p className="font-medium">{data.logistics?.import_certification_details || '—'}</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3 border border-border">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><BoxIcon className="w-3 h-3" /> Packaging Details</p>
          <p className="font-medium">{data.logistics?.packaging_details || '—'}</p>
        </div>
      </div>

      {/* Specifications */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Wrench className="w-4 h-4 text-muted-foreground" />
          Key Specifications ({data.sales_content?.key_specifications?.length || 0})
        </h3>
        {data.sales_content?.key_specifications && data.sales_content.key_specifications.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.sales_content.key_specifications.map((spec, i) => (
              <span key={i} className="text-xs bg-secondary px-2 py-1 rounded-md border border-border">{spec}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">—</p>
        )}
      </div>

      {/* Package Options */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Boxes className="w-4 h-4 text-muted-foreground" />
          Package Options ({data.sales_content?.package_options?.length || 0})
        </h3>
        {data.sales_content?.package_options && data.sales_content.package_options.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.sales_content.package_options.map((o, i) => (
              <span key={i} className="text-xs bg-secondary px-2 py-1 rounded-md border border-border">{o}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">—</p>
        )}
      </div>

      {/* Applications */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          Applications ({data.sales_content?.applications?.length || 0})
        </h3>
        {data.sales_content?.applications && data.sales_content.applications.length > 0 ? (
          <ul className="space-y-1">
            {data.sales_content.applications.map((app, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{app}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">—</p>
        )}
      </div>

      {/* Certifications Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Award className="w-4 h-4 text-muted-foreground" />
          Certifications ({data.sales_content?.certifications?.length || 0})
        </h3>
        {data.sales_content?.certifications && data.sales_content.certifications.length > 0 ? (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_2fr] bg-primary text-primary-foreground text-xs font-medium">
              <div className="p-2">Certification</div>
              <div className="p-2">Details</div>
            </div>
            {data.sales_content.certifications.map((cert, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr] border-t border-border text-sm">
                <div className="p-2 font-medium bg-secondary/30">{cert.name}</div>
                <div className="p-2">{cert.details || '—'}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">—</p>
        )}
      </div>

      {/* Field count summary */}
      <div className="bg-secondary/30 rounded-lg p-3 border border-border">
        <p className="text-xs text-muted-foreground text-center">
          Displaying all predefined fields • Empty fields shown as "—"
        </p>
      </div>
    </div>
  );
};

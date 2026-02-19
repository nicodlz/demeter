import type { VATRate } from '@/schemas';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const VAT_EXEMPTION_REASONS = [
  'VAT not applicable, art. 293 B of CGI (France)',
  'Reverse charge - B2B services outside EU',
  'Reverse charge - Article 196 of EU VAT Directive',
  'Intra-community supply - Article 138 of EU VAT Directive',
  'Export outside EU - Article 146 of EU VAT Directive',
  'VAT exempt - Article 261 of CGI (France)',
  'Place of supply outside EU - services',
  'VAT not applicable',
] as const;

const VAT_EXEMPTION_LABELS: Record<string, string> = {
  'VAT not applicable, art. 293 B of CGI (France)':
    'VAT not applicable, art. 293 B of CGI (France)',
  'Reverse charge - B2B services outside EU':
    'Reverse charge - B2B services outside EU',
  'Reverse charge - Article 196 of EU VAT Directive':
    'Reverse charge - Article 196 of EU VAT Directive',
  'Intra-community supply - Article 138 of EU VAT Directive':
    'Intra-community supply - Article 138',
  'Export outside EU - Article 146 of EU VAT Directive':
    'Export outside EU - Article 146',
  'VAT exempt - Article 261 of CGI (France)':
    'VAT exempt - Article 261 of CGI (France)',
  'Place of supply outside EU - services':
    'Place of supply outside EU - services',
  'VAT not applicable': 'VAT not applicable',
};

interface VATSectionProps {
  applyVAT: boolean;
  vatCountry: string;
  vatExemptionReason: string;
  vatRates: VATRate[];
  onApplyVATChange: (checked: boolean) => void;
  onVatCountryChange: (country: string) => void;
  onVatExemptionReasonChange: (reason: string) => void;
}

export const VATSection = ({
  applyVAT,
  vatCountry,
  vatExemptionReason,
  vatRates,
  onApplyVATChange,
  onVatCountryChange,
  onVatExemptionReasonChange,
}: VATSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>VAT Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="applyVAT"
            checked={applyVAT}
            onCheckedChange={(checked) => onApplyVATChange(checked === true)}
          />
          <Label htmlFor="applyVAT" className="cursor-pointer">
            Apply VAT
          </Label>
        </div>

        {applyVAT ? (
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="vatCountry">Country (VAT)</Label>
            <Select value={vatCountry} onValueChange={onVatCountryChange}>
              <SelectTrigger id="vatCountry">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vatRates.map((rate) => (
                  <SelectItem key={rate.countryCode} value={rate.countryCode}>
                    {rate.country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="vatExemptionReason">VAT Exemption Reason</Label>
            <Select value={vatExemptionReason} onValueChange={onVatExemptionReasonChange}>
              <SelectTrigger id="vatExemptionReason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VAT_EXEMPTION_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {VAT_EXEMPTION_LABELS[reason] ?? reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

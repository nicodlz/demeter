import { useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import type { IssuerSettings, Currency } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save } from 'lucide-react';

export const SettingsPage = () => {
  const { settings, updateIssuer, updateSettings } = useSettings();
  const [formData, setFormData] = useState<IssuerSettings>(settings.issuer);
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>(settings.defaultCurrency || 'USD');
  const [dashboardCurrency, setDashboardCurrency] = useState<Currency>(settings.dashboardCurrency || 'USD');
  const [taxProvisionEnabled, setTaxProvisionEnabled] = useState(settings.taxProvisionEnabled ?? false);
  const [taxRate, setTaxRate] = useState(settings.taxRate ?? 30);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateIssuer(formData);
    updateSettings({ 
      defaultCurrency, 
      dashboardCurrency,
      taxProvisionEnabled,
      taxRate,
    });
    alert('Settings saved!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Configure your company information and legal mentions
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>Your company contact details</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                name="companyName"
                id="companyName"
                required
                value={formData.companyName}
                onChange={handleChange}
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                name="address"
                id="address"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                name="postalCode"
                id="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                name="city"
                id="city"
                value={formData.city}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                name="country"
                id="country"
                value={formData.country}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                type="email"
                name="email"
                id="email"
                required
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                type="tel"
                name="phone"
                id="phone"
                value={formData.phone || ''}
                onChange={handleChange}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Currency Settings</CardTitle>
            <CardDescription>Default currencies for invoices and dashboard</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultCurrency">Default Invoice Currency</Label>
              <Select value={defaultCurrency} onValueChange={(v) => setDefaultCurrency(v as Currency)}>
                <SelectTrigger id="defaultCurrency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default currency for new invoices
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dashboardCurrency">Dashboard Display Currency</Label>
              <Select value={dashboardCurrency} onValueChange={(v) => setDashboardCurrency(v as Currency)}>
                <SelectTrigger id="dashboardCurrency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                All dashboard stats will be converted to this currency
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tax Provision</CardTitle>
            <CardDescription>Automatically calculate monthly tax provisions in cash flow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="taxProvisionEnabled">Enable Tax Provision</Label>
                <p className="text-sm text-muted-foreground">
                  Show estimated tax provision in money flow diagram
                </p>
              </div>
              <Switch
                id="taxProvisionEnabled"
                checked={taxProvisionEnabled}
                onCheckedChange={setTaxProvisionEnabled}
              />
            </div>

            {taxProvisionEnabled && (
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  type="number"
                  name="taxRate"
                  id="taxRate"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground">
                  Percentage of income to set aside for taxes (e.g., 30% for typical freelancer rate)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Legal Information</CardTitle>
            <CardDescription>Business registration and legal details</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="siret">SIRET</Label>
              <Input
                name="siret"
                id="siret"
                value={formData.siret}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vatNumber">VAT Number</Label>
              <Input
                name="vatNumber"
                id="vatNumber"
                value={formData.vatNumber}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalForm">Legal Form</Label>
              <Input
                name="legalForm"
                id="legalForm"
                placeholder="SASU, EURL, Auto-entrepreneur..."
                value={formData.legalForm}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capital">Capital</Label>
              <Input
                name="capital"
                id="capital"
                placeholder="10000 EUR"
                value={formData.capital}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rcs">RCS</Label>
              <Input
                name="rcs"
                id="rcs"
                placeholder="RCS Paris 123 456 789"
                value={formData.rcs}
                onChange={handleChange}
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="additionalLegalMentions">Additional Legal Mentions</Label>
              <Textarea
                name="additionalLegalMentions"
                id="additionalLegalMentions"
                rows={3}
                value={formData.additionalLegalMentions}
                onChange={handleChange}
                placeholder="Additional legal information..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
};

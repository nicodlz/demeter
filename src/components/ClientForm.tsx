import { useState } from 'react';
import type { Client } from '@/schemas';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ClientFormProps {
  client?: Client;
  onSubmit: (clientData: Omit<Client, 'id'>) => void;
  onCancel: () => void;
}

export const ClientForm = ({ client, onSubmit, onCancel }: ClientFormProps) => {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    email: client?.email || '',
    address: client?.address || '',
    postalCode: client?.postalCode || '',
    city: client?.city || '',
    country: client?.country || '',
    siret: client?.siret || '',
    vatNumber: client?.vatNumber || '',
    deliveryAddress: client?.deliveryAddress || '',
    deliveryPostalCode: client?.deliveryPostalCode || '',
    deliveryCity: client?.deliveryCity || '',
    deliveryCountry: client?.deliveryCountry || '',
    additionalInfo: client?.additionalInfo || '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              name="name"
              id="name"
              required
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              name="email"
              id="email"
              value={formData.email}
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
            <Label htmlFor="siret">SIRET</Label>
            <Input
              name="siret"
              id="siret"
              value={formData.siret}
              onChange={handleChange}
              placeholder="12345678901234"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Address</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="deliveryAddress">Address</Label>
            <Input
              name="deliveryAddress"
              id="deliveryAddress"
              value={formData.deliveryAddress}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryPostalCode">Postal Code</Label>
            <Input
              name="deliveryPostalCode"
              id="deliveryPostalCode"
              value={formData.deliveryPostalCode}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryCity">City</Label>
            <Input
              name="deliveryCity"
              id="deliveryCity"
              value={formData.deliveryCity}
              onChange={handleChange}
            />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="deliveryCountry">Country</Label>
            <Input
              name="deliveryCountry"
              id="deliveryCountry"
              value={formData.deliveryCountry}
              onChange={handleChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="additionalInfo">Notes</Label>
            <Textarea
              name="additionalInfo"
              id="additionalInfo"
              rows={2}
              value={formData.additionalInfo}
              onChange={handleChange}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {client ? 'Update' : 'Add'}
        </Button>
      </div>
    </form>
  );
};

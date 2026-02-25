import type { Currency } from '@/schemas';
import { formatCurrency } from '@/utils/formatters';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Calculator, Wallet, FileText, TrendingUp } from 'lucide-react';

interface StatsCardsProps {
  totalTTC: number;
  totalHT: number;
  totalVAT: number;
  invoiceCount: number;
  averageInvoice: number;
  currency: Currency;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
}

const StatCard = ({ title, value, icon, iconBg }: StatCardProps) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${iconBg}`}>{icon}</div>
        <div className="ml-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const StatsCards = ({
  totalTTC,
  totalHT,
  totalVAT,
  invoiceCount,
  averageInvoice,
  currency,
}: StatsCardsProps) => {
  const { mask } = usePrivacyMode();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      <StatCard
        title="Total (incl. VAT)"
        value={mask(formatCurrency(totalTTC, currency))}
        iconBg="bg-blue-100 text-blue-600"
        icon={<DollarSign className="h-6 w-6" />}
      />

      <StatCard
        title="Total (excl. VAT)"
        value={mask(formatCurrency(totalHT, currency))}
        iconBg="bg-indigo-100 text-indigo-600"
        icon={<Calculator className="h-6 w-6" />}
      />

      <StatCard
        title="VAT collected"
        value={mask(formatCurrency(totalVAT, currency))}
        iconBg="bg-green-100 text-green-600"
        icon={<Wallet className="h-6 w-6" />}
      />

      <StatCard
        title="Invoices"
        value={invoiceCount.toString()}
        iconBg="bg-purple-100 text-purple-600"
        icon={<FileText className="h-6 w-6" />}
      />

      <StatCard
        title="Average / invoice"
        value={mask(formatCurrency(averageInvoice, currency))}
        iconBg="bg-amber-100 text-amber-600"
        icon={<TrendingUp className="h-6 w-6" />}
      />
    </div>
  );
};

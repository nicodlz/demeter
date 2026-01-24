import type { Currency } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface NetWorthStatsCardsProps {
  totalNetWorth: number;
  snapshotCount: number;
  changeFromPrevious: number | null;
  changePercentage: number | null;
  currency: Currency;
  privacyMode?: boolean;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  subValue?: string;
  subValueColor?: string;
}

const StatCard = ({ title, value, icon, iconBg, subValue, subValueColor }: StatCardProps) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${iconBg}`}>{icon}</div>
        <div className="ml-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
          {subValue && (
            <p className={`text-sm ${subValueColor || 'text-muted-foreground'}`}>
              {subValue}
            </p>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

export const NetWorthStatsCards = ({
  totalNetWorth,
  snapshotCount,
  changeFromPrevious,
  changePercentage,
  currency,
  privacyMode = false,
}: NetWorthStatsCardsProps) => {
  const isPositive = changeFromPrevious !== null && changeFromPrevious >= 0;
  const changeIcon = isPositive ? (
    <TrendingUp className="h-6 w-6" />
  ) : (
    <TrendingDown className="h-6 w-6" />
  );
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
  const changeBg = isPositive
    ? 'bg-green-100 text-green-600'
    : 'bg-red-100 text-red-600';

  const mask = (value: string) => privacyMode ? '•••••' : value;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Net Worth"
        value={mask(formatCurrency(totalNetWorth, currency))}
        iconBg="bg-blue-100 text-blue-600"
        icon={<Wallet className="h-6 w-6" />}
      />

      {changeFromPrevious !== null && (
        <StatCard
          title="Change"
          value={mask(formatCurrency(Math.abs(changeFromPrevious), currency))}
          iconBg={changeBg}
          icon={changeIcon}
          subValue={
            changePercentage !== null
              ? `${isPositive ? '+' : ''}${changePercentage.toFixed(1)}%`
              : undefined
          }
          subValueColor={changeColor}
        />
      )}

      {changePercentage !== null && (
        <StatCard
          title="Change %"
          value={`${isPositive ? '+' : ''}${changePercentage.toFixed(2)}%`}
          iconBg={changeBg}
          icon={changeIcon}
        />
      )}

      <StatCard
        title="Snapshots"
        value={snapshotCount.toString()}
        iconBg="bg-purple-100 text-purple-600"
        icon={<Calendar className="h-6 w-6" />}
      />
    </div>
  );
};

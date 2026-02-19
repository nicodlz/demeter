import { useState } from 'react';
import { formatCurrency } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Currency } from '@/schemas';

interface TopMerchantsCardProps {
  merchants: Array<{
    merchant: string;
    total: number;
    count: number;
  }>;
  currency: Currency;
  privacyMode?: boolean;
  defaultLimit?: number;
  expandedLimit?: number;
}

export const TopMerchantsCard = ({
  merchants,
  currency,
  privacyMode = false,
  defaultLimit = 10,
  expandedLimit,
}: TopMerchantsCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const mask = (value: string) => privacyMode ? '•••••' : value;

  if (merchants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Merchants</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground">
          Import expenses to see top merchants
        </CardContent>
      </Card>
    );
  }

  const maxTotal = merchants[0]?.total || 1;
  const limit = expanded ? (expandedLimit ?? merchants.length) : defaultLimit;
  const displayedMerchants = merchants.slice(0, limit);
  const hasMore = merchants.length > defaultLimit;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Merchants</CardTitle>
        <CardDescription>Where you spend the most ({merchants.length} total)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayedMerchants.map((m, index) => (
            <div key={m.merchant} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium truncate" title={m.merchant}>
                    {m.merchant}
                  </span>
                  <span className="text-sm font-bold ml-2">
                    {mask(formatCurrency(m.total, currency))}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-destructive"
                    // style kept: width is a runtime-computed percentage (merchant total / max);
                    // Tailwind arbitrary values require build-time constants, not runtime math.
                    style={{ width: `${(m.total / maxTotal) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {m.count} transactions
                </p>
              </div>
            </div>
          ))}
        </div>
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-4"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show all {merchants.length} merchants
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

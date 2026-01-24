import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface PeriodSelectorProps {
  startDate: Date;
  endDate: Date;
  onPeriodChange: (start: Date, end: Date) => void;
}

type PeriodPreset = 'month' | 'quarter' | 'year' | 'last12';

export const PeriodSelector = ({
  startDate,
  endDate,
  onPeriodChange,
}: PeriodSelectorProps) => {
  const getPresetDates = (preset: PeriodPreset): { start: Date; end: Date } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (preset) {
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start, end: today };
      }
      case 'quarter': {
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        const start = new Date(now.getFullYear(), quarterStart, 1);
        return { start, end: today };
      }
      case 'year': {
        const start = new Date(now.getFullYear(), 0, 1);
        return { start, end: today };
      }
      case 'last12': {
        const start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        return { start, end: today };
      }
    }
  };

  const handlePresetClick = (preset: PeriodPreset) => {
    const { start, end } = getPresetDates(preset);
    onPeriodChange(start, end);
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = new Date(e.target.value);
    if (!isNaN(newStart.getTime())) {
      onPeriodChange(newStart, endDate);
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = new Date(e.target.value);
    newEnd.setHours(23, 59, 59);
    if (!isNaN(newEnd.getTime())) {
      onPeriodChange(startDate, newEnd);
    }
  };

  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const isPresetActive = (preset: PeriodPreset): boolean => {
    const { start, end } = getPresetDates(preset);
    return (
      start.toDateString() === startDate.toDateString() &&
      end.toDateString() === endDate.toDateString()
    );
  };

  const presets: { id: PeriodPreset; label: string }[] = [
    { id: 'month', label: 'This month' },
    { id: 'quarter', label: 'This quarter' },
    { id: 'year', label: 'This year' },
    { id: 'last12', label: 'Last 12 months' },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.id}
                variant={isPresetActive(preset.id) ? 'default' : 'secondary'}
                size="sm"
                onClick={() => handlePresetClick(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          <div className="flex items-center gap-2 text-sm">
            <Label className="text-muted-foreground">From</Label>
            <Input
              type="date"
              value={formatDateForInput(startDate)}
              onChange={handleStartChange}
              className="w-auto h-8"
            />
            <Label className="text-muted-foreground">to</Label>
            <Input
              type="date"
              value={formatDateForInput(endDate)}
              onChange={handleEndChange}
              className="w-auto h-8"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

import { useRef, useCallback, useState, type ReactNode } from 'react';
import { toPng } from 'html-to-image';
import { Download, Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ExportableChartProps {
  children: ReactNode;
  /** File name (without extension). A timestamp suffix is appended automatically. */
  filename: string;
  /** Pixel ratio for the exported image (default 2). */
  pixelRatio?: number;
}

/**
 * Wraps any chart in a container and overlays a small download button (top-right).
 * Clicking the button exports the chart area to a high-resolution PNG with a white
 * background and padding — ready for slides / reports.
 */
export const ExportableChart = ({
  children,
  filename,
  pixelRatio = 2,
}: ExportableChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!chartRef.current || exporting) return;

    setExporting(true);
    try {
      const dataUrl = await toPng(chartRef.current, {
        pixelRatio,
        backgroundColor: '#ffffff',
        style: {
          padding: '24px',
        },
        // Filter out the export button itself so it doesn't appear in the PNG
        filter: (node: HTMLElement) => {
          return !node?.dataset?.exportButton;
        },
      });

      const link = document.createElement('a');
      const now = new Date();
      const dateSuffix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      link.download = `${filename}-${dateSuffix}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export chart as PNG:', err);
    } finally {
      setExporting(false);
    }
  }, [filename, pixelRatio, exporting]);

  return (
    <div className="relative" ref={chartRef}>
      {children}

      {/* Export button — absolutely positioned in top-right corner */}
      <div
        data-export-button="true"
        className="absolute top-2 right-2 z-10"
      >
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background/80 backdrop-blur-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                aria-label="Exporter en PNG"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Exporter en PNG</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

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
  /** Fixed export width in px — chart is rendered at this width regardless of screen size (default 1200). */
  exportWidth?: number;
}

/**
 * Wraps any chart in a container and overlays a small download button (top-right).
 * Clicking the button clones the chart into an off-screen container at a fixed width,
 * waits for Recharts/SVG to re-render, then exports to a high-resolution PNG with a
 * white background and padding — ready for slides / reports.
 */
export const ExportableChart = ({
  children,
  filename,
  pixelRatio = 2,
  exportWidth = 1200,
}: ExportableChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!chartRef.current || exporting) return;

    setExporting(true);
    try {
      // Clone the chart into an off-screen container at a fixed width so the
      // export is always consistent regardless of current viewport size.
      const clone = chartRef.current.cloneNode(true) as HTMLElement;

      // Remove the export button from the clone
      clone.querySelectorAll('[data-export-button]').forEach((el) => el.remove());

      // Create off-screen wrapper
      const offscreen = document.createElement('div');
      offscreen.style.position = 'fixed';
      offscreen.style.left = '-99999px';
      offscreen.style.top = '0';
      offscreen.style.width = `${exportWidth}px`;
      offscreen.style.backgroundColor = '#ffffff';
      offscreen.style.padding = '24px';

      // Force the clone to fill the fixed width
      clone.style.width = '100%';
      clone.style.maxWidth = 'none';

      // Force all ResponsiveContainer / recharts wrappers to fill
      clone.querySelectorAll('.recharts-responsive-container').forEach((el) => {
        (el as HTMLElement).style.width = '100%';
        (el as HTMLElement).style.height = (el as HTMLElement).style.height || '400px';
      });

      offscreen.appendChild(clone);
      document.body.appendChild(offscreen);

      // Wait for the browser to layout + re-render SVGs at the new width
      await new Promise((r) => setTimeout(r, 500));

      const dataUrl = await toPng(offscreen, {
        pixelRatio,
        backgroundColor: '#ffffff',
      });

      // Cleanup
      document.body.removeChild(offscreen);

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
  }, [filename, pixelRatio, exportWidth, exporting]);

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

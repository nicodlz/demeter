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
  /** Fixed export width in px (default 1200). The chart is temporarily resized to this width, Recharts re-renders, then we capture. */
  exportWidth?: number;
}

/**
 * Wraps any chart and overlays a download button (top-right).
 *
 * Export strategy: temporarily force the container to a fixed width so that
 * Recharts' ResponsiveContainer fires its ResizeObserver and re-renders the
 * SVG at the target dimensions. Then capture, then restore original size.
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

    const el = chartRef.current;

    // Save original styles
    const origWidth = el.style.width;
    const origMinWidth = el.style.minWidth;
    const origMaxWidth = el.style.maxWidth;
    const origPosition = el.style.position;
    const origZIndex = el.style.zIndex;
    const origOverflow = el.parentElement?.style.overflow || '';

    try {
      // Prevent the parent from clipping or scrolling while we resize
      if (el.parentElement) {
        el.parentElement.style.overflow = 'visible';
      }

      // Force the element to the export width — Recharts will re-render via ResizeObserver
      el.style.width = `${exportWidth}px`;
      el.style.minWidth = `${exportWidth}px`;
      el.style.maxWidth = `${exportWidth}px`;
      el.style.position = 'relative';
      el.style.zIndex = '-1';

      // Wait for Recharts ResizeObserver to fire and SVG to re-render
      // Two rAFs + a timeout ensures layout is recalculated and SVGs are painted
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(resolve, 600);
          });
        });
      });

      const dataUrl = await toPng(el, {
        pixelRatio,
        backgroundColor: '#ffffff',
        style: {
          padding: '24px',
        },
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
      // Restore original styles
      el.style.width = origWidth;
      el.style.minWidth = origMinWidth;
      el.style.maxWidth = origMaxWidth;
      el.style.position = origPosition;
      el.style.zIndex = origZIndex;
      if (el.parentElement) {
        el.parentElement.style.overflow = origOverflow;
      }
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

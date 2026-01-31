import { useState } from 'react';
import type { Invoice } from '@/types';
import { getCurrencySymbol } from '@/utils/formatters';
import { calculateSubtotal, calculateSplitRatio } from '@/utils/invoiceCalculations';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Copy, Check, AlertCircle, ExternalLink } from 'lucide-react';

interface RecibosVerdeModalProps {
  invoice: Invoice;
  splitAmount: number;
  onClose: () => void;
}

interface CopyFieldProps {
  label: string;
  value: string;
  hint?: string;
}

function CopyField({ label, value, hint }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  }

  return (
    <div className="border rounded-lg p-3 bg-muted/50">
      <div className="flex justify-between items-start mb-1">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 px-2"
        >
          {error ? (
            <>
              <AlertCircle className="h-3 w-3 mr-1 text-destructive" />
              <span className="text-xs text-destructive">Error</span>
            </>
          ) : copied ? (
            <>
              <Check className="h-3 w-3 mr-1 text-green-600" />
              <span className="text-xs text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </Button>
      </div>
      <div className="text-sm font-mono bg-background border rounded px-2 py-1.5 break-all">
        {value || <span className="text-muted-foreground italic">-</span>}
      </div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

interface VatExemption {
  code: string;
  text: string;
}

function getVatExemption(applyVAT: boolean): VatExemption {
  if (!applyVAT) {
    return {
      code: 'M10',
      text: 'IVA - Autoliquidacao - Artigo 6. n. 6 alinea a) do CIVA',
    };
  }
  return { code: '', text: 'Taxa normal' };
}

export function RecibosVerdeModal({
  invoice,
  splitAmount,
  onClose,
}: RecibosVerdeModalProps) {
  const currencySymbol = getCurrencySymbol(invoice.currency);
  const total = calculateSubtotal(invoice.lineItems);
  const ratio = calculateSplitRatio(splitAmount, total);
  const vatExemption = getVatExemption(invoice.applyVAT);

  function buildDescription(): string {
    return invoice.lineItems
      .map((item) => {
        const partBAmount = item.quantity * item.unitPrice * ratio;
        return `${item.description} - ${currencySymbol}${partBAmount.toFixed(2)}`;
      })
      .join('\n');
  }

  function handleOpenPortal(): void {
    window.open(
      'https://faturas.portaldasfinancas.gov.pt/consultarEmitirDocumentos.action',
      '_blank'
    );
  }

  const fields = [
    {
      label: 'Tipo de Documento',
      value: 'Fatura-Recibo',
      hint: 'Selecionar no dropdown do Portal',
    },
    {
      label: 'NIF Cliente',
      value: invoice.client.nif || '999999990',
      hint: '999999990 = Consumidor final estrangeiro',
    },
    {
      label: 'Nome Cliente',
      value: invoice.client.name,
    },
    {
      label: 'Pais Cliente',
      value: invoice.client.country || 'US',
      hint: 'Estados Unidos = US',
    },
    {
      label: 'Descricao do Servico',
      value: buildDescription(),
      hint: 'Copiar para o campo "Descricao"',
    },
    {
      label: 'Valor Base (Part B)',
      value: splitAmount.toFixed(2),
      hint: `Total Part B: ${currencySymbol}${splitAmount.toFixed(2)}`,
    },
    {
      label: 'Moeda',
      value: invoice.currency,
    },
    {
      label: 'Isencao IVA',
      value: vatExemption.text,
      hint: vatExemption.code ? `Codigo: ${vatExemption.code}` : undefined,
    },
    {
      label: 'Data',
      value: invoice.date,
    },
    {
      label: 'Referencia Interna',
      value: invoice.number,
      hint: 'Para tua referencia',
    },
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader className="bg-gradient-to-r from-green-600 to-green-700 -m-6 mb-0 p-6 rounded-t-lg">
          <DialogTitle className="text-white text-xl">
            Recibo Verde - Part B
          </DialogTitle>
          <DialogDescription className="text-green-100">
            Copiar dados para Portal das Financas
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Instrucoes:</strong> Clica em "Copy" para cada campo e
              cola no Portal das Financas. O botao em baixo abre diretamente
              o portal.
            </p>
          </div>

          <div className="grid gap-3">
            {fields.map((field) => (
              <CopyField
                key={field.label}
                label={field.label}
                value={field.value}
                hint={field.hint}
              />
            ))}
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={handleOpenPortal} className="bg-green-600 hover:bg-green-700">
            Abrir Portal das Financas
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

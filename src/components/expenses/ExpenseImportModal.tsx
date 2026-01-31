import { useState, useRef } from 'react';
import type { ParsedTransaction, BankProvider } from '@/types';
import { parseStatements, detectProvider, getProviderDisplayName, getProviderInputType, parsePdfFile } from '@/utils/parsers';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImportPreview } from './ImportPreview';
import { Upload, FileText, AlertCircle, FileUp, Loader2 } from 'lucide-react';

interface ExpenseImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (
    transactions: ParsedTransaction[],
    source: string,
    provider: BankProvider
  ) => void;
  findDuplicates: (transactions: ParsedTransaction[]) => {
    unique: ParsedTransaction[];
    duplicates: ParsedTransaction[];
  };
}

type Step = 'input' | 'preview';

const PROVIDERS: BankProvider[] = ['deblock', 'bourso', 'gnosis_pay', 'etherfi', 'credit_agricole'];

export const ExpenseImportModal = ({
  open,
  onClose,
  onImport,
  findDuplicates,
}: ExpenseImportModalProps) => {
  const [step, setStep] = useState<Step>('input');
  const [provider, setProvider] = useState<BankProvider | ''>('');
  const [textContent, setTextContent] = useState('');
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [duplicates, setDuplicates] = useState<ParsedTransaction[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('input');
    setProvider('');
    setTextContent('');
    setParsedTransactions([]);
    setDuplicates([]);
    setParseError(null);
    setIsLoading(false);
    setIsDragging(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleParse = (content: string) => {
    if (!provider) {
      // Try auto-detection
      const detected = detectProvider(content);
      if (detected) {
        setProvider(detected);
        doParse(content, detected);
      } else {
        setParseError('Could not detect format. Please select a provider manually.');
      }
    } else {
      doParse(content, provider);
    }
  };

  const doParse = (content: string, selectedProvider: BankProvider) => {
    setParseError(null);

    const result = parseStatements(content, selectedProvider, 'EUR');

    if (!result.success || result.transactions.length === 0) {
      setParseError(
        result.errors.length > 0
          ? result.errors.join(', ')
          : 'No transactions found. Check the format.'
      );
      return;
    }

    // Filter out credits (we only want debits)
    const debitsOnly = result.transactions.filter((t) => !t.isCredit);

    if (debitsOnly.length === 0) {
      setParseError('No debit transactions found (credits are excluded).');
      return;
    }

    // Check for duplicates
    const { unique, duplicates: dups } = findDuplicates(debitsOnly);

    setParsedTransactions(unique);
    setDuplicates(dups);
    setStep('preview');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      setTextContent(content);

      // Auto-detect provider from content
      const detected = detectProvider(content);
      if (detected && !provider) {
        setProvider(detected);
      }

      handleParse(content);
    } catch (err) {
      setParseError('Failed to read file');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !provider) return;

    setIsLoading(true);
    setParseError(null);

    try {
      const result = await parsePdfFile(file, provider, 'EUR');

      if (!result.success || result.transactions.length === 0) {
        setParseError(
          result.errors.length > 0
            ? result.errors.join(', ')
            : 'No transactions found in PDF.'
        );
        setIsLoading(false);
        return;
      }

      // Filter out credits (we only want debits)
      const debitsOnly = result.transactions.filter((t) => !t.isCredit);

      if (debitsOnly.length === 0) {
        setParseError('No debit transactions found (credits are excluded).');
        setIsLoading(false);
        return;
      }

      // Check for duplicates
      const { unique, duplicates: dups } = findDuplicates(debitsOnly);

      setParsedTransactions(unique);
      setDuplicates(dups);
      setIsLoading(false);
      setStep('preview');
    } catch (err) {
      setParseError(`Failed to parse PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
    }

    // Reset file input
    if (pdfInputRef.current) {
      pdfInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      // Create a fake event for the PDF handler
      const fakeEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handlePdfUpload(fakeEvent);
    }
  };

  const handleImportConfirm = (selected: ParsedTransaction[]) => {
    if (!provider) {
      setParseError('Please select a provider');
      setStep('input');
      return;
    }

    onImport(selected, getProviderDisplayName(provider), provider);
    handleClose();
  };

  const inputType = provider ? getProviderInputType(provider) : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>Import Expenses</DialogTitle>
          <DialogDescription>
            Import transactions from your bank statements
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="provider">Bank / Provider</Label>
              <Select
                value={provider}
                onValueChange={(v) => setProvider(v as BankProvider)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {getProviderDisplayName(p)}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({getProviderInputType(p) === 'csv' ? 'CSV' : getProviderInputType(p) === 'pdf' ? 'PDF' : 'Text'})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {provider && inputType === 'pdf' && (
              <div className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                    id="pdf-upload"
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                        <span className="text-sm text-muted-foreground">
                          Parsing PDF...
                        </span>
                      </>
                    ) : isDragging ? (
                      <>
                        <FileUp className="h-8 w-8 text-primary" />
                        <span className="text-sm text-primary font-medium">
                          Drop PDF here
                        </span>
                      </>
                    ) : (
                      <>
                        <FileUp className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Drag & drop or click to upload
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {getProviderDisplayName(provider)} PDF statement
                        </span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            )}

            {provider && inputType !== 'pdf' && (
              <Tabs defaultValue={inputType === 'csv' ? 'file' : 'text'}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Paste Text
                  </TabsTrigger>
                  <TabsTrigger value="file" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload File
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-4">
                  <div>
                    <Label htmlFor="textContent">Paste bank statement</Label>
                    <Textarea
                      id="textContent"
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Copy and paste your bank statement here..."
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>
                  <Button
                    onClick={() => handleParse(textContent)}
                    disabled={!textContent.trim()}
                    className="w-full"
                  >
                    Parse Transactions
                  </Button>
                </TabsContent>

                <TabsContent value="file" className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload CSV or TXT file
                      </span>
                    </label>
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {!provider && (
              <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
                Select a provider to start importing
              </div>
            )}

            {parseError && (
              <div className="p-3 bg-destructive/10 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <span className="text-sm text-destructive">{parseError}</span>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <ImportPreview
            transactions={parsedTransactions}
            duplicates={duplicates}
            onConfirm={handleImportConfirm}
            onCancel={() => setStep('input')}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

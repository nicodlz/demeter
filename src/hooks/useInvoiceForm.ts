import { generateId } from '@/utils/id';
import { useState, useRef, useEffect, useMemo } from 'react';
import type { Invoice, LineItem, CustomField, Currency, SavedItem } from '@/schemas';
import { useClients } from '@/hooks/useClients';
import { useSettings } from '@/hooks/useSettings';
import { useSavedItems } from '@/hooks/useSavedItems';
import { generateInvoiceNumber, parseInvoiceNumber } from '@/utils/invoiceNumber';
import { useInvoices } from '@/hooks/useInvoices';
import { getCurrencySymbol } from '@/utils/formatters';
import {
  calculateSubtotal as calcSubtotal,
  calculateVAT as calcVAT,
  calculateTotal as calcTotal,
  calculateSplitPercentage,
} from '@/utils/invoiceCalculations';

interface UseInvoiceFormOptions {
  invoice?: Invoice;
  onSubmit: (invoice: Invoice) => void;
}

export function useInvoiceForm({ invoice, onSubmit }: UseInvoiceFormOptions) {
  const { clients } = useClients();
  const { settings } = useSettings();
  const { invoices: existingInvoices } = useInvoices();
  const { savedItems, saveFromLineItem, incrementUsage, getMostUsedItems, deleteSavedItem } =
    useSavedItems();

  // ── Autocomplete state ──────────────────────────────────────────────────────
  const [activeAutocomplete, setActiveAutocomplete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({});
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [selectedClientId, setSelectedClientId] = useState(invoice?.client.id || '');
  const [date, setDate] = useState(
    invoice?.date || new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [lineItems, setLineItems] = useState<LineItem[]>(
    invoice?.lineItems || [
      {
        id: generateId(),
        description: '',
        quantity: 1,
        unit: 'day',
        unitPrice: 0,
        vatRate: settings.vatRates[0]?.defaultRate || 20,
        type: 'service',
      },
    ]
  );
  const [customFields, setCustomFields] = useState<CustomField[]>(
    invoice?.customFields || []
  );
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [paymentTerms, setPaymentTerms] = useState(
    invoice?.paymentTerms || settings.defaultPaymentTerms
  );
  const [applyVAT, setApplyVAT] = useState(invoice?.applyVAT ?? true);
  const [vatCountry, setVatCountry] = useState(
    invoice?.vatCountry || settings.vatRates[0]?.countryCode || 'FR'
  );
  const [vatExemptionReason, setVatExemptionReason] = useState(
    invoice?.vatExemptionReason || 'VAT not applicable, art. 293 B of CGI (France)'
  );
  const [splitEnabled, setSplitEnabled] = useState(invoice?.splitEnabled || false);
  const [splitAmount, setSplitAmount] = useState(invoice?.splitAmount || 0);
  const [currency, setCurrency] = useState<Currency>(
    invoice?.currency || settings.defaultCurrency || 'USD'
  );

  // ── Derived values ──────────────────────────────────────────────────────────
  const currencySymbol = getCurrencySymbol(currency);

  const selectedVatRate = settings.vatRates.find(
    (rate) => rate.countryCode === vatCountry
  );

  const subtotal = useMemo(() => calcSubtotal(lineItems), [lineItems]);
  const vat = useMemo(() => calcVAT(lineItems, applyVAT), [lineItems, applyVAT]);
  const total = useMemo(() => calcTotal(lineItems, applyVAT), [lineItems, applyVAT]);
  const splitPercentage = useMemo(
    () => calculateSplitPercentage(splitAmount, total),
    [splitAmount, total]
  );

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target as Node)
      ) {
        setActiveAutocomplete(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Autocomplete helpers ────────────────────────────────────────────────────
  const getFilteredSavedItems = (itemId: string): SavedItem[] => {
    const query = searchQuery[itemId]?.toLowerCase() || '';
    if (!query) return getMostUsedItems(5);
    return savedItems
      .filter((item) => item.description.toLowerCase().includes(query))
      .slice(0, 5);
  };

  const applySavedItem = (lineItemId: string, savedItem: SavedItem) => {
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === lineItemId
          ? {
              ...item,
              description: savedItem.description,
              unit: savedItem.unit,
              unitPrice: savedItem.unitPrice,
              type: savedItem.type,
              quantity: savedItem.defaultQuantity,
            }
          : item
      )
    );
    incrementUsage(savedItem.id);
    setActiveAutocomplete(null);
    setSearchQuery((prev) => ({ ...prev, [lineItemId]: '' }));
  };

  const handleDescriptionChange = (lineItemId: string, value: string) => {
    updateLineItem(lineItemId, 'description', value);
    setSearchQuery((prev) => ({ ...prev, [lineItemId]: value }));
    setActiveAutocomplete(lineItemId);
  };

  // ── Line item handlers ──────────────────────────────────────────────────────
  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: generateId(),
        description: '',
        quantity: 1,
        unit: 'day',
        unitPrice: 0,
        vatRate: selectedVatRate?.defaultRate || 20,
        type: 'service',
      },
    ]);
  };

  const updateLineItem = <K extends keyof LineItem>(
    id: string,
    field: K,
    value: LineItem[K]
  ) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeLineItem = (id: string) => {
    setLineItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  };

  // ── Custom field handlers ───────────────────────────────────────────────────
  const addCustomField = () => {
    setCustomFields((prev) => [
      ...prev,
      { id: generateId(), label: '', value: '' },
    ]);
  };

  const updateCustomField = (id: string, field: 'label' | 'value', value: string) => {
    setCustomFields((prev) =>
      prev.map((cf) => (cf.id === id ? { ...cf, [field]: value } : cf))
    );
  };

  const removeCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((cf) => cf.id !== id));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedClient = clients.find((c) => c.id === selectedClientId);
    if (!selectedClient) {
      alert('Please select a client');
      return;
    }

    lineItems.forEach((item) => {
      if (item.description.trim()) {
        saveFromLineItem(item);
      }
    });

    const invoiceNumber =
      invoice?.number ||
      (() => {
        const currentYear = new Date().getFullYear().toString();
        const maxCounter = existingInvoices
          .filter((i) => i.number.startsWith(currentYear))
          .map((i) => parseInvoiceNumber(i.number) || 0)
          .reduce((max, n) => Math.max(max, n), 0);
        return generateInvoiceNumber(maxCounter + 1, settings.invoiceNumberFormat);
      })();

    const newInvoice: Invoice = {
      id: invoice?.id || generateId(),
      number: invoiceNumber,
      date,
      dueDate,
      client: selectedClient,
      lineItems,
      customFields: customFields.filter((cf) => cf.label && cf.value),
      notes,
      paymentTerms,
      applyVAT,
      vatCountry,
      vatExemptionReason: applyVAT ? undefined : vatExemptionReason,
      splitEnabled,
      splitAmount: splitEnabled ? splitAmount : undefined,
      currency,
      createdAt: invoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSubmit(newInvoice);
  };

  return {
    // Clients (needed in InvoiceForm for the select)
    clients,
    settings,
    savedItems,
    deleteSavedItem,

    // State
    selectedClientId,
    date,
    dueDate,
    lineItems,
    customFields,
    notes,
    paymentTerms,
    applyVAT,
    vatCountry,
    vatExemptionReason,
    splitEnabled,
    splitAmount,
    currency,
    activeAutocomplete,
    searchQuery,

    // Derived
    currencySymbol,
    selectedVatRate,
    subtotal,
    vat,
    total,
    splitPercentage,

    // Refs
    autocompleteRef,

    // Setters
    setSelectedClientId,
    setDate,
    setDueDate,
    setNotes,
    setPaymentTerms,
    setApplyVAT,
    setVatCountry,
    setVatExemptionReason,
    setSplitEnabled,
    setSplitAmount,
    setCurrency,
    setActiveAutocomplete,

    // Handlers
    getFilteredSavedItems,
    applySavedItem,
    handleDescriptionChange,
    addLineItem,
    updateLineItem,
    removeLineItem,
    addCustomField,
    updateCustomField,
    removeCustomField,
    handleSubmit,
  };
}

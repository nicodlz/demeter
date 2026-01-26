import jsPDF from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import type { Invoice, IssuerSettings, InvoiceMetadata } from '../types';
import { getCurrencySymbol } from '../utils/formatters';

const METADATA_VERSION = '1.0.0';

export class PDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin = 20;
  private currentY = 20;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  async generateInvoicePDF(
    invoice: Invoice,
    issuer: IssuerSettings
  ): Promise<Blob> {
    this.reset();

    // Header
    this.addHeader(invoice, issuer);

    // Client info
    this.addClientInfo(invoice);

    // Invoice details
    this.addInvoiceDetails(invoice);

    // Line items table
    this.addLineItemsTable(invoice);

    // Custom fields
    if (invoice.customFields.length > 0) {
      this.addCustomFields(invoice);
    }

    // Footer with legal mentions
    this.addFooter(issuer, invoice);

    // Convert to blob and add metadata
    const pdfBlob = this.doc.output('blob');
    return await this.addMetadataToPDF(pdfBlob, invoice, issuer);
  }

  private reset() {
    this.doc = new jsPDF();
    this.currentY = 20;
  }

  private addHeader(_invoice: Invoice, issuer: IssuerSettings) {
    // Company name (large, bold)
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(issuer.companyName, this.margin, this.currentY);

    // Issuer address block (right side)
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    const issuerLines = [
      issuer.address,
      `${issuer.postalCode} ${issuer.city}`,
      issuer.country,
      issuer.email,
      issuer.phone,
    ].filter((line): line is string => Boolean(line));

    let lineY = this.currentY;
    issuerLines.forEach((line) => {
      const textWidth = this.doc.getTextWidth(line);
      this.doc.text(line, this.pageWidth - this.margin - textWidth, lineY);
      lineY += 4;
    });

    this.currentY += 30;

    // INVOICE title
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('INVOICE', this.margin, this.currentY);

    this.currentY += 15;
  }

  private addClientInfo(invoice: Invoice) {
    // Client section
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Bill to:', this.margin, this.currentY);

    this.currentY += 6;
    this.doc.setFont('helvetica', 'normal');

    const clientLines = [
      invoice.client.name,
      invoice.client.email,
      invoice.client.address,
      invoice.client.postalCode && invoice.client.city
        ? `${invoice.client.postalCode} ${invoice.client.city}`
        : null,
      invoice.client.country,
      invoice.client.siret ? `SIRET: ${invoice.client.siret}` : null,
      invoice.client.vatNumber ? `VAT: ${invoice.client.vatNumber}` : null,
    ].filter(Boolean) as string[];

    clientLines.forEach((line) => {
      this.doc.text(line, this.margin, this.currentY);
      this.currentY += 5;
    });

    // Delivery address if different
    if (invoice.client.deliveryAddress) {
      this.currentY += 3;
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Delivery to:', this.margin, this.currentY);
      this.currentY += 6;
      this.doc.setFont('helvetica', 'normal');

      const deliveryLines = [
        invoice.client.deliveryAddress,
        invoice.client.deliveryPostalCode && invoice.client.deliveryCity
          ? `${invoice.client.deliveryPostalCode} ${invoice.client.deliveryCity}`
          : null,
        invoice.client.deliveryCountry,
      ].filter(Boolean) as string[];

      deliveryLines.forEach((line) => {
        this.doc.text(line, this.margin, this.currentY);
        this.currentY += 5;
      });
    }

    this.currentY += 5;
  }

  private addInvoiceDetails(invoice: Invoice) {
    const rightX = this.pageWidth - this.margin - 60;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');

    // Invoice number
    this.doc.text('Invoice #:', rightX, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(invoice.number, rightX + 30, this.currentY);

    this.currentY += 6;
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Date:', rightX, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(
      new Date(invoice.date).toLocaleDateString('en-US'),
      rightX + 30,
      this.currentY
    );

    this.currentY += 6;
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Due Date:', rightX, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(
      new Date(invoice.dueDate).toLocaleDateString('en-US'),
      rightX + 30,
      this.currentY
    );

    this.currentY += 15;
  }

  private addLineItemsTable(invoice: Invoice) {
    const tableTop = this.currentY;
    const colWidths = {
      description: invoice.applyVAT ? 70 : 90,
      quantity: 15,
      unit: 20,
      unitPrice: 25,
      vatRate: invoice.applyVAT ? 18 : 0,
      total: 25,
    };

    // Table header
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(
      this.margin,
      tableTop,
      this.pageWidth - 2 * this.margin,
      8,
      'F'
    );

    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');

    let colX = this.margin + 2;
    this.doc.text('Description', colX, tableTop + 5);
    colX += colWidths.description;
    this.doc.text('Qty', colX, tableTop + 5);
    colX += colWidths.quantity;
    this.doc.text('Unit', colX, tableTop + 5);
    colX += colWidths.unit;
    this.doc.text('Price', colX, tableTop + 5);
    colX += colWidths.unitPrice;
    if (invoice.applyVAT) {
      this.doc.text('VAT%', colX, tableTop + 5);
      colX += colWidths.vatRate;
    }
    this.doc.text('Total', colX, tableTop + 5);

    this.currentY = tableTop + 12;
    this.doc.setFont('helvetica', 'normal');

    // Table rows
    invoice.lineItems.forEach((item) => {
      const rowHeight = 6;
      colX = this.margin + 2;

      // Description (with word wrap if needed)
      const descLines = this.doc.splitTextToSize(
        item.description,
        colWidths.description - 4
      );
      this.doc.text(descLines, colX, this.currentY);

      colX += colWidths.description;
      this.doc.text(item.quantity.toString(), colX, this.currentY);

      colX += colWidths.quantity;
      // Display unit
      const unitLabel = item.unit || 'unit';
      this.doc.text(unitLabel, colX, this.currentY);

      colX += colWidths.unit;
      const symbol = getCurrencySymbol(invoice.currency || 'USD');
      this.doc.text(`${symbol}${item.unitPrice.toFixed(2)}`, colX, this.currentY);

      colX += colWidths.unitPrice;
      if (invoice.applyVAT) {
        this.doc.text(`${item.vatRate}%`, colX, this.currentY);
        colX += colWidths.vatRate;
      }

      const lineTotal = item.quantity * item.unitPrice;
      this.doc.text(`${symbol}${lineTotal.toFixed(2)}`, colX, this.currentY);

      this.currentY += Math.max(rowHeight, descLines.length * 4 + 2);
    });

    // Horizontal line
    this.currentY += 2;
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(
      this.margin,
      this.currentY,
      this.pageWidth - this.margin,
      this.currentY
    );

    this.currentY += 8;

    // Totals
    this.addTotals(invoice);
  }

  private addTotals(invoice: Invoice) {
    const subtotal = invoice.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const vat = invoice.applyVAT
      ? invoice.lineItems.reduce(
          (sum, item) =>
            sum + item.quantity * item.unitPrice * (item.vatRate / 100),
          0
        )
      : 0;

    const total = subtotal + vat;
    const symbol = getCurrencySymbol(invoice.currency || 'USD');

    const rightX = this.pageWidth - this.margin - 50;
    const valueX = this.pageWidth - this.margin - 30;

    this.doc.setFontSize(10);

    // Subtotal
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Subtotal:', rightX, this.currentY, { align: 'right' });
    this.doc.text(`${symbol}${subtotal.toFixed(2)}`, valueX, this.currentY, {
      align: 'right',
    });

    if (invoice.applyVAT) {
      this.currentY += 6;
      this.doc.text('VAT:', rightX, this.currentY, { align: 'right' });
      this.doc.text(`${symbol}${vat.toFixed(2)}`, valueX, this.currentY, {
        align: 'right',
      });
    } else if (invoice.vatExemptionReason) {
      // Display VAT exemption reason
      this.currentY += 6;
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'italic');
      this.doc.setTextColor(80, 80, 80);
      const exemptionText = this.doc.splitTextToSize(
        invoice.vatExemptionReason,
        this.pageWidth - this.margin - rightX - 10
      );
      this.doc.text(exemptionText, this.margin, this.currentY);
      this.doc.setTextColor(0, 0, 0);
      this.doc.setFontSize(10);
      this.currentY += exemptionText.length * 3;
    }

    // Total
    this.currentY += 8;
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Total:', rightX, this.currentY, { align: 'right' });
    this.doc.text(`${symbol}${total.toFixed(2)}`, valueX, this.currentY, {
      align: 'right',
    });

    this.currentY += 12;
  }

  private addCustomFields(invoice: Invoice) {
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Additional Information:', this.margin, this.currentY);

    this.currentY += 5;
    this.doc.setFont('helvetica', 'normal');

    invoice.customFields.forEach((field) => {
      this.doc.text(
        `${field.label}: ${field.value}`,
        this.margin + 2,
        this.currentY
      );
      this.currentY += 4;
    });

    this.currentY += 5;
  }

  private addFooter(issuer: IssuerSettings, invoice: Invoice) {
    const footerY = this.pageHeight - 40;

    // Payment terms
    if (invoice.paymentTerms) {
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Payment Terms:', this.margin, footerY);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(invoice.paymentTerms, this.margin, footerY + 5);
    }

    // Notes
    if (invoice.notes) {
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'italic');
      const noteLines = this.doc.splitTextToSize(
        invoice.notes,
        this.pageWidth - 2 * this.margin
      );
      this.doc.text(noteLines, this.margin, footerY + 12);
    }

    // Legal mentions
    const legalY = this.pageHeight - 25;
    this.doc.setFontSize(7);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 100, 100);

    const legalLines = [
      issuer.siret ? `SIRET: ${issuer.siret}` : null,
      issuer.vatNumber ? `VAT: ${issuer.vatNumber}` : null,
      issuer.legalForm,
      issuer.capital,
      issuer.rcs,
      issuer.additionalLegalMentions,
    ]
      .filter(Boolean)
      .join(' - ');

    const wrappedLegal = this.doc.splitTextToSize(
      legalLines,
      this.pageWidth - 2 * this.margin
    );
    this.doc.text(wrappedLegal, this.pageWidth / 2, legalY, {
      align: 'center',
    });
  }

  private async addMetadataToPDF(
    pdfBlob: Blob,
    invoice: Invoice,
    issuer: IssuerSettings
  ): Promise<Blob> {
    try {
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      const metadata: InvoiceMetadata = {
        version: METADATA_VERSION,
        invoice,
        issuer,
      };

      // Add metadata as custom property
      pdfDoc.setTitle(`Invoice ${invoice.number}`);
      pdfDoc.setSubject(`Invoice for ${invoice.client.name}`);
      pdfDoc.setKeywords(['invoice', invoice.number]);
      pdfDoc.setProducer('Demeter');
      pdfDoc.setCreator('Demeter');

      // Store JSON metadata in a custom field (we'll use the Author field)
      pdfDoc.setAuthor(JSON.stringify(metadata));

      const modifiedPdfBytes = await pdfDoc.save();
      return new Blob([new Uint8Array(modifiedPdfBytes)], { type: 'application/pdf' });
    } catch (error) {
      console.error('Error adding metadata to PDF:', error);
      // Return original PDF if metadata addition fails
      return pdfBlob;
    }
  }

  static async extractMetadataFromPDF(
    file: File
  ): Promise<InvoiceMetadata | null> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      const author = pdfDoc.getAuthor();
      if (!author) return null;

      const metadata = JSON.parse(author) as InvoiceMetadata;

      // Validate metadata structure
      if (
        metadata.version &&
        metadata.invoice &&
        metadata.issuer &&
        metadata.invoice.number
      ) {
        return metadata;
      }

      return null;
    } catch (error) {
      console.error('Error extracting metadata from PDF:', error);
      return null;
    }
  }
}

export const generateInvoicePDF = async (
  invoice: Invoice,
  issuer: IssuerSettings
): Promise<Blob> => {
  const generator = new PDFGenerator();
  return await generator.generateInvoicePDF(invoice, issuer);
};

export const extractInvoiceFromPDF = async (
  file: File
): Promise<InvoiceMetadata | null> => {
  return await PDFGenerator.extractMetadataFromPDF(file);
};

// ─────────────────────────────────────────────────────────────────────────────
// PDF Invoice Generator
// Page 1: Full invoice layout (ETTR brand, bill-to, route, line items)
// Page 2+: Each uploaded image document as a full page
//          PDF documents get a reference page (jsPDF can't embed PDFs)
// ─────────────────────────────────────────────────────────────────────────────

import jsPDF from 'jspdf';

// ── Layout constants (mm, US Letter 215.9 x 279.4) ────────────────────────────
const PW = 215.9;
const PH = 279.4;
const M  = 16;       // margin
const CW = PW - M * 2; // content width

// ── Palette (RGB) ─────────────────────────────────────────────────────────────
const DARK   = [15,  23,  42];   // slate-950  (header bg)
const MID    = [100, 116, 139];  // slate-500  (labels)
const LIGHT  = [148, 163, 184];  // slate-400  (dim text)
const MAIN   = [15,  23,  42];   // dark text on white pages
const STRIPE = [248, 250, 252];  // slate-50   (alt row)
const RULE   = [226, 232, 240];  // slate-200  (dividers)
const GREEN  = [16,  185, 129];  // emerald-500

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt$(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function cap(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

function imgFormat(base64) {
  const m = base64.match(/^data:image\/([a-zA-Z]+)/);
  const ext = (m?.[1] || 'jpeg').toUpperCase();
  return ext === 'JPG' ? 'JPEG' : ext;
}

// Load an image and return its natural dimensions so we can fit it correctly.
function loadImageDimensions(base64) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = base64;
  });
}

// ── Document type labels ──────────────────────────────────────────────────────
const DOC_TYPE_LABELS = {
  rate_con:      'Rate Confirmation',
  bol_unsigned:  'Bill of Lading (Unsigned)',
  bol_signed:    'Bill of Lading (Signed)',
  lumper_receipt:'Lumper Receipt',
  scale_ticket:  'Scale Ticket',
  other:         'Supporting Document',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export async function generateInvoicePDF(load, invoice, broker, driver) {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });

  // ── Page 1: Invoice ──────────────────────────────────────────────────────────
  buildInvoicePage(doc, load, invoice, broker, driver);

  // ── Pages 2+: Document images ─────────────────────────────────────────────
  const allDocs = load.documents || [];
  const imageDocs = allDocs.filter(d => d.base64Data?.startsWith('data:image'));
  const pdfDocs   = allDocs.filter(d => d.base64Data?.startsWith('data:application/pdf'));

  for (const d of imageDocs) {
    await addImagePage(doc, d);
  }
  for (const d of pdfDocs) {
    addPdfReferencePage(doc, d, load, invoice);
  }

  return doc;
}

// ── Download helper ───────────────────────────────────────────────────────────

export async function downloadInvoicePDF(load, invoice, broker, driver) {
  const doc = await generateInvoicePDF(load, invoice, broker, driver);
  doc.save(`${invoice.invoiceNumber}-${load.loadNumber}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Page builders
// ─────────────────────────────────────────────────────────────────────────────

function buildInvoicePage(doc, load, invoice, broker, driver) {
  let y = 0;

  // ── Dark header bar ──────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, PW, 36, 'F');

  // ETTR
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('ETTR', M, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...LIGHT);
  doc.text('Carrier Operations', M, 21);

  // INVOICE (right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', PW - M, 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...LIGHT);
  doc.text(invoice.invoiceNumber, PW - M, 19.5, { align: 'right' });

  const dateStr = new Date(invoice.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  doc.text(dateStr, PW - M, 26, { align: 'right' });

  y = 44;

  // ── Bill To + Load Details (two columns) ──────────────────────────────────
  const col = CW / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...MID);
  doc.text('BILL TO', M, y);
  doc.text('LOAD DETAILS', M + col, y);
  y += 5;

  // Broker (left column)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...MAIN);
  doc.text(broker?.companyName || 'Unknown Broker', M, y);

  let brokerY = y + 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MID);
  const brokerLines = [
    broker?.contactName,
    broker?.address,
    broker?.email,
    broker?.phone,
  ].filter(Boolean);
  for (const line of brokerLines) {
    const wrapped = doc.splitTextToSize(line, col - 6);
    doc.text(wrapped, M, brokerY);
    brokerY += wrapped.length * 4.8;
  }

  // Load details (right column) — key:value pairs
  let detailY = y;
  function detail(label, value) {
    if (!value) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...MID);
    doc.text(label, M + col, detailY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MAIN);
    const val = doc.splitTextToSize(String(value), col - 28);
    doc.text(val, M + col + 24, detailY);
    detailY += val.length * 5;
  }

  detail('Load #',    load.loadNumber);
  if (load.referenceNumber) detail('Ref #', load.referenceNumber);
  detail('Pickup',    load.shipper?.pickupDate   || 'N/A');
  detail('Delivery',  load.consignee?.deliveryDate || 'N/A');
  if (driver) detail('Driver', driver.name);
  if (broker?.paymentTerms) detail('Terms', broker.paymentTerms);

  y = Math.max(brokerY, detailY) + 9;

  // ── Rule ──────────────────────────────────────────────────────────────────
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.3);
  doc.line(M, y, PW - M, y);
  y += 7;

  // ── Route section ─────────────────────────────────────────────────────────
  doc.setFillColor(...STRIPE);
  doc.roundedRect(M, y, CW, 30, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...MID);
  doc.text('ROUTE', M + 4, y + 5.5);

  const rY = y + 12;
  const mid = M + CW / 2;

  // Shipper
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...MAIN);
  doc.text(load.shipper?.name || 'Shipper', M + 4, rY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MID);
  const shipLines = doc.splitTextToSize(load.shipper?.address || '', CW / 2 - 10);
  doc.text(shipLines, M + 4, rY + 5);

  // Arrow
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...MID);
  doc.text('>', mid, rY + 2, { align: 'center' });

  // Consignee
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...MAIN);
  doc.text(load.consignee?.name || 'Consignee', PW - M - 4, rY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MID);
  const consLines = doc.splitTextToSize(load.consignee?.address || '', CW / 2 - 10);
  doc.text(consLines, PW - M - 4, rY + 5, { align: 'right' });

  // Miles
  if (load.rate?.miles) {
    doc.setFontSize(7.5);
    doc.setTextColor(...LIGHT);
    doc.text(`${load.rate.miles} miles`, mid, y + 26, { align: 'center' });
  }

  y += 38;

  // ── Line items table ──────────────────────────────────────────────────────
  // Header
  doc.setFillColor(...DARK);
  doc.rect(M, y, CW, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPTION', M + 3, y + 5.5);
  doc.text('DETAILS',     M + CW * 0.55, y + 5.5);
  doc.text('AMOUNT',      PW - M - 3,    y + 5.5, { align: 'right' });
  y += 8;

  function tableRow(desc, detail, amount, shade) {
    if (shade) {
      doc.setFillColor(...STRIPE);
      doc.rect(M, y, CW, 8, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MAIN);
    doc.text(String(desc), M + 3, y + 5.5);

    doc.setFontSize(7.5);
    doc.setTextColor(...MID);
    doc.text(String(detail || ''), M + CW * 0.55, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...MAIN);
    doc.text(String(amount), PW - M - 3, y + 5.5, { align: 'right' });
    y += 8;
  }

  const charges = load.charges || [];
  tableRow('Freight Charges', load.rate?.type === 'per_mile' ? 'Per mile' : 'Flat rate', fmt$(load.rate?.amount), false);
  charges.forEach((c, i) => {
    tableRow(cap(c.type), c.description || '', fmt$(c.amount), (i + 1) % 2 === 0);
  });

  // Total
  y += 2;
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.5);
  doc.line(M, y, PW - M, y);
  y += 4;

  const totalCharges = charges.reduce((s, c) => s + Number(c.amount || 0), 0);
  const totalAmount  = invoice.totalAmount ?? ((load.rate?.amount || 0) + totalCharges);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MID);
  doc.text('TOTAL AMOUNT DUE', PW - M - 3, y + 5, { align: 'right' });
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...DARK);
  doc.text(fmt$(totalAmount), PW - M - 3, y, { align: 'right' });
  y += 10;

  // ── Attached documents list ───────────────────────────────────────────────
  const allDocs = (load.documents || []).filter(d => d.fileName);
  if (allDocs.length > 0) {
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.3);
    doc.line(M, y, PW - M, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...MID);
    doc.text('ATTACHED DOCUMENTS', M, y);
    y += 5.5;

    for (const d of allDocs) {
      // Small filled square as checkmark
      doc.setFillColor(...GREEN);
      doc.rect(M, y - 2.3, 2.2, 2.2, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...MAIN);
      doc.text(d.fileName, M + 4.5, y);

      // Doc type label on right
      doc.setFontSize(7.5);
      doc.setTextColor(...LIGHT);
      doc.text(DOC_TYPE_LABELS[d.type] || cap(d.type), PW - M - 3, y, { align: 'right' });
      y += 5.5;
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const footY = PH - 14;
  doc.setFillColor(...DARK);
  doc.rect(0, footY - 4, PW, 14 + 4, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...LIGHT);
  doc.text(
    `Thank you for your business. Please remit payment within ${broker?.paymentTerms || 'Net 30'}.`,
    PW / 2, footY + 1, { align: 'center' }
  );
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('ETTR | Carrier Operations', PW / 2, footY + 5.5, { align: 'center' });
}

// ── Add one image document as a full page ─────────────────────────────────────
async function addImagePage(doc, docRecord) {
  doc.addPage();

  // Small header
  doc.setFillColor(...DARK);
  doc.rect(0, 0, PW, 13, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('ETTR', M, 8.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...LIGHT);
  const typeLabel = DOC_TYPE_LABELS[docRecord.type] || cap(docRecord.type);
  doc.text(typeLabel, PW - M, 8.5, { align: 'right' });

  // Filename
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MID);
  doc.text(docRecord.fileName, M, 19);

  // Fit image to remaining page area (maintain aspect ratio)
  const imgAreaX = M;
  const imgAreaY = 22;
  const imgAreaW = CW;
  const imgAreaH = PH - imgAreaY - M;

  try {
    const { w, h } = await loadImageDimensions(docRecord.base64Data);
    const aspect = w / h;

    let imgW = imgAreaW;
    let imgH = imgW / aspect;
    if (imgH > imgAreaH) {
      imgH = imgAreaH;
      imgW = imgH * aspect;
    }
    const imgX = imgAreaX + (imgAreaW - imgW) / 2;
    const imgY = imgAreaY;

    doc.addImage(docRecord.base64Data, imgFormat(docRecord.base64Data), imgX, imgY, imgW, imgH, undefined, 'FAST');
  } catch {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MID);
    doc.text('(Image could not be embedded)', PW / 2, PH / 2, { align: 'center' });
  }
}

// ── Add a reference page for PDF documents (jsPDF can't embed PDFs) ───────────
function addPdfReferencePage(doc, docRecord, load, invoice) {
  doc.addPage();

  doc.setFillColor(...DARK);
  doc.rect(0, 0, PW, 13, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('ETTR', M, 8.5);

  const midY = PH / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...MID);
  doc.text('PDF Document Attached Separately', PW / 2, midY - 14, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MAIN);
  doc.text(docRecord.fileName, PW / 2, midY - 6, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(...LIGHT);
  doc.text(
    `This PDF document (${docRecord.fileName}) is part of invoice ${invoice.invoiceNumber} for load ${load.loadNumber}.`,
    PW / 2, midY + 2, { align: 'center', maxWidth: CW }
  );
  doc.text('Please attach the original file when forwarding this invoice.', PW / 2, midY + 9, { align: 'center' });
}

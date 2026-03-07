import { useState } from 'react';
import { useData } from '../context/DataContext';
import { downloadInvoicePDF } from '../services/pdfGenerator';

function fmt$(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export default function InvoiceScreen({ nav, loadId, invoiceId }) {
  const { loads, brokers, drivers, invoices, updateInvoice } = useData();
  const [pdfLoading, setPdfLoading] = useState(false);

  const load    = loads.find((l) => l.id === loadId);
  const invoice = invoices.find((i) => i.id === invoiceId);
  const broker  = load ? brokers.find((b) => b.id === load.brokerId)          : null;
  const driver  = load ? drivers.find((d) => d.id === load.assignedDriverId)  : null;

  if (!load || !invoice) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Invoice not found.</div>
      </div>
    );
  }

  const charges = load.charges || [];
  const docs    = load.documents || [];

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleDownloadPDF() {
    setPdfLoading(true);
    try {
      await downloadInvoicePDF(load, invoice, broker, driver);
    } catch (e) {
      alert('PDF generation failed: ' + e.message);
    } finally {
      setPdfLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleEmail() {
    if (!broker?.email) return;

    const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber} – ${load.loadNumber}`);
    const shipCity   = load.shipper?.address?.split(',').slice(-2, -1)[0]?.trim()   || load.shipper?.name   || '';
    const consCity   = load.consignee?.address?.split(',').slice(-2, -1)[0]?.trim() || load.consignee?.name || '';

    const body = encodeURIComponent(
      `Hello ${broker.contactName || 'Team'},\n\n` +
      `Please find attached Invoice ${invoice.invoiceNumber} for Load ${load.loadNumber}.\n\n` +
      `Route:      ${shipCity} → ${consCity}\n` +
      `Pickup:     ${load.shipper?.pickupDate  || 'N/A'}\n` +
      `Delivery:   ${load.consignee?.deliveryDate || 'N/A'}\n` +
      `Amount Due: ${fmt$(invoice.totalAmount)}\n` +
      `Terms:      ${broker.paymentTerms || 'Net 30'}\n\n` +
      `Please remit payment to ETTR.\n\n` +
      `Thank you for your business!\n\nETTR`
    );

    window.open(`mailto:${broker.email}?subject=${subject}&body=${body}`);
    updateInvoice(invoice.id, { status: 'sent', sentAt: new Date().toISOString() });
  }

  async function handleMarkPaid() {
    await updateInvoice(invoice.id, { status: 'paid', paidAt: new Date().toISOString() });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 z-40 print:hidden">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button
            onClick={() => nav('load-detail', { loadId })}
            className="text-slate-400 hover:text-white text-xl leading-none"
          >
            &#8592;
          </button>
          <span className="font-bold text-white">{invoice.invoiceNumber}</span>
          <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${
            invoice.status === 'paid' ? 'bg-green-700 text-white' :
            invoice.status === 'sent' ? 'bg-blue-700 text-white' :
            'bg-slate-700 text-slate-300'
          }`}>
            {invoice.status?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Invoice preview (HTML / print) */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white text-slate-900 rounded-2xl p-6 print:rounded-none print:shadow-none">

          {/* ── Invoice header ── */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">ETTR</div>
              <div className="text-sm text-slate-500 mt-0.5">Carrier Operations</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-800">INVOICE</div>
              <div className="text-slate-500 text-sm mt-1">{invoice.invoiceNumber}</div>
              <div className="text-slate-500 text-sm">
                {new Date(invoice.generatedAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </div>
            </div>
          </div>

          {/* ── Bill To + Load Details ── */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Bill To</div>
              <div className="font-semibold text-slate-800">{broker?.companyName || 'Broker'}</div>
              {broker?.contactName && <div className="text-sm text-slate-600">{broker.contactName}</div>}
              {broker?.email       && <div className="text-sm text-slate-600">{broker.email}</div>}
              {broker?.phone       && <div className="text-sm text-slate-600">{broker.phone}</div>}
              {broker?.address     && <div className="text-sm text-slate-600">{broker.address}</div>}
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Load Details</div>
              <div className="text-sm text-slate-700 space-y-0.5">
                <div><strong>Load #:</strong> {load.loadNumber}</div>
                {load.referenceNumber && <div><strong>Ref #:</strong> {load.referenceNumber}</div>}
                <div><strong>Pickup:</strong> {load.shipper?.pickupDate || 'N/A'}</div>
                <div><strong>Delivery:</strong> {load.consignee?.deliveryDate || 'N/A'}</div>
                {driver && <div><strong>Driver:</strong> {driver.name}</div>}
                {broker?.paymentTerms && <div><strong>Terms:</strong> {broker.paymentTerms}</div>}
              </div>
            </div>
          </div>

          {/* ── Route ── */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">Route</div>
            <div className="flex items-start gap-3 text-sm">
              <div className="flex-1">
                <div className="font-semibold text-slate-800">{load.shipper?.name}</div>
                <div className="text-slate-500 text-xs mt-0.5">{load.shipper?.address}</div>
              </div>
              <div className="text-slate-400 font-bold pt-1">&#8594;</div>
              <div className="flex-1 text-right">
                <div className="font-semibold text-slate-800">{load.consignee?.name}</div>
                <div className="text-slate-500 text-xs mt-0.5">{load.consignee?.address}</div>
              </div>
            </div>
            {load.rate?.miles && (
              <div className="text-xs text-slate-400 text-center mt-2">{load.rate.miles} miles</div>
            )}
          </div>

          {/* ── Line items ── */}
          <div className="mb-6">
            <div className="grid grid-cols-3 text-xs text-slate-400 uppercase tracking-wider border-b-2 border-slate-200 pb-2 mb-2">
              <div>Description</div>
              <div className="text-center">Details</div>
              <div className="text-right">Amount</div>
            </div>

            <div className="divide-y divide-slate-100">
              <div className="grid grid-cols-3 text-sm py-2.5">
                <div className="font-medium">Freight Charges</div>
                <div className="text-center text-slate-500 capitalize">
                  {load.rate?.type === 'per_mile' ? 'Per mile' : 'Flat rate'}
                </div>
                <div className="text-right font-semibold">{fmt$(load.rate?.amount)}</div>
              </div>
              {charges.map((c) => (
                <div key={c.id} className="grid grid-cols-3 text-sm py-2.5">
                  <div className="font-medium capitalize">{c.type.replace(/_/g, ' ')}</div>
                  <div className="text-center text-slate-500 text-xs">{c.description}</div>
                  <div className="text-right font-semibold">{fmt$(c.amount)}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-4 pt-4 border-t-2 border-slate-200">
              <div className="text-right">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Amount Due</div>
                <div className="text-2xl font-black text-slate-900">{fmt$(invoice.totalAmount)}</div>
              </div>
            </div>
          </div>

          {/* ── Documents list ── */}
          {docs.length > 0 && (
            <div className="border-t border-slate-200 pt-4 mb-4">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">
                Attached Documents
              </div>
              <div className="space-y-1.5">
                {docs.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="text-emerald-500 font-bold">&#10003;</span>
                      <span>{d.fileName}</span>
                    </div>
                    {d.base64Data && (
                      <span className="text-xs text-slate-400 ml-2">
                        {d.base64Data.startsWith('data:image') ? 'image' : 'pdf'}
                      </span>
                    )}
                  </div>
                ))}
                {docs.some(d => d.base64Data?.startsWith('data:application/pdf')) && (
                  <p className="text-xs text-slate-400 mt-2 italic">
                    * PDF documents are listed separately; attach originals when forwarding.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
            Thank you for your business. Please remit payment within {broker?.paymentTerms || 'Net 30'}.
          </div>
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/95 border-t border-slate-800 z-40 print:hidden">
        <div className="max-w-2xl mx-auto space-y-2">
          {/* Row 1: Download + Print */}
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
            >
              {pdfLoading ? 'Building PDF...' : 'Download PDF'}
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
            >
              Print
            </button>
          </div>

          {/* Row 2: Email + Mark Paid */}
          <div className="flex gap-2">
            {broker?.email && (
              <button
                onClick={handleEmail}
                className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
              >
                Email to Broker
              </button>
            )}
            {invoice.status !== 'paid' && (
              <button
                onClick={handleMarkPaid}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
              >
                Mark Paid
              </button>
            )}
          </div>

          {/* PDF note */}
          {!pdfLoading && docs.some(d => d.base64Data?.startsWith('data:image')) && (
            <p className="text-center text-xs text-slate-600">
              PDF includes {docs.filter(d => d.base64Data?.startsWith('data:image')).length} image document{docs.filter(d => d.base64Data?.startsWith('data:image')).length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

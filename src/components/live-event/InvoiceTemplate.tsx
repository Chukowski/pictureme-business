import { forwardRef } from "react";
import { AlbumTransaction } from "@/services/eventsApi";
import { format } from "date-fns";

interface InvoiceTemplateProps {
  transaction: AlbumTransaction;
  eventConfig?: any;
  onClose?: () => void;
}

/**
 * InvoiceTemplate - A printable invoice component
 * 
 * Uses HTML/CSS optimized for printing via window.print()
 * Apply this component in a full-page modal and use the print button.
 */
export const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ transaction, eventConfig }, ref) => {
    const pricing = eventConfig?.pricing || {};
    const branding = eventConfig?.branding || {};
    const businessInfo = pricing.businessInfo || {};
    
    const currency = pricing.currency || 'USD';
    const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
    const taxName = pricing.taxName || 'Tax';

    const eventName = eventConfig?.title || 'Photo Booth Event';
    const primaryColor = branding.primaryColor || '#6366f1';
    const logoUrl = branding.logoUrl;

    const invoiceDate = format(new Date(transaction.created_at), 'MMMM d, yyyy');
    const invoiceNumber = transaction.invoice_number || `INV-${transaction.id.slice(0, 8).toUpperCase()}`;

    return (
      <div 
        ref={ref}
        className="bg-white text-black p-8 max-w-2xl mx-auto font-sans print:p-0"
        style={{ minHeight: '100vh' }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            {logoUrl ? (
              <img src={logoUrl} alt={eventName} className="h-16 mb-2" />
            ) : (
              <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>
                {eventName}
              </h1>
            )}
            {businessInfo.name && (
              <p className="text-sm text-gray-600 mt-1">{businessInfo.name}</p>
            )}
            {businessInfo.address && (
              <p className="text-sm text-gray-500">{businessInfo.address}</p>
            )}
            {businessInfo.taxId && (
              <p className="text-sm text-gray-500">Tax ID: {businessInfo.taxId}</p>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-gray-800">INVOICE</h2>
            <p className="text-gray-600 mt-2">
              <span className="font-medium">Invoice #:</span> {invoiceNumber}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Date:</span> {invoiceDate}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t-2 mb-6" style={{ borderColor: primaryColor }} />

        {/* Bill To */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Bill To
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-medium text-gray-800">
              {transaction.customer_name || transaction.visitor_name || 'Guest Customer'}
            </p>
            {transaction.customer_email && (
              <p className="text-gray-600 text-sm">{transaction.customer_email}</p>
            )}
            {transaction.customer_phone && (
              <p className="text-gray-600 text-sm">{transaction.customer_phone}</p>
            )}
            {transaction.album_code && (
              <p className="text-gray-500 text-sm mt-2">
                Album: <span className="font-mono">{transaction.album_code}</span>
              </p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2" style={{ borderColor: primaryColor }}>
              <th className="text-left py-3 text-gray-600 font-semibold">Description</th>
              <th className="text-center py-3 text-gray-600 font-semibold w-20">Qty</th>
              <th className="text-right py-3 text-gray-600 font-semibold w-28">Price</th>
              <th className="text-right py-3 text-gray-600 font-semibold w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-4">
                <p className="font-medium text-gray-800">
                  {transaction.package_name || 'Photo Album'}
                </p>
                {transaction.notes && (
                  <p className="text-sm text-gray-500 mt-1">{transaction.notes}</p>
                )}
              </td>
              <td className="text-center py-4 text-gray-600">
                {transaction.item_count || 1}
              </td>
              <td className="text-right py-4 text-gray-600">
                {currencySymbol}{transaction.amount.toFixed(2)}
              </td>
              <td className="text-right py-4 font-medium text-gray-800">
                {currencySymbol}{transaction.amount.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64">
            <div className="flex justify-between py-2 text-gray-600">
              <span>Subtotal</span>
              <span>{currencySymbol}{transaction.amount.toFixed(2)}</span>
            </div>
            {transaction.tax_amount > 0 && (
              <div className="flex justify-between py-2 text-gray-600 border-b border-gray-200">
                <span>{taxName} ({((transaction.tax_amount / transaction.amount) * 100).toFixed(1)}%)</span>
                <span>{currencySymbol}{transaction.tax_amount.toFixed(2)}</span>
              </div>
            )}
            <div 
              className="flex justify-between py-3 text-xl font-bold"
              style={{ color: primaryColor }}
            >
              <span>Total</span>
              <span>{currencySymbol}{transaction.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="mt-8 text-center">
          <span 
            className="inline-block px-4 py-2 rounded-full text-sm font-semibold text-white uppercase"
            style={{ backgroundColor: transaction.status === 'completed' ? '#10b981' : '#f59e0b' }}
          >
            {transaction.status === 'completed' ? 'PAID' : 'PENDING'}
          </span>
          {transaction.payment_method && (
            <p className="text-gray-500 text-sm mt-2">
              Payment Method: <span className="capitalize">{transaction.payment_method}</span>
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          {businessInfo.email && (
            <p>Questions? Contact us at {businessInfo.email}</p>
          )}
          {businessInfo.phone && (
            <p>Phone: {businessInfo.phone}</p>
          )}
          <p className="mt-4 text-xs">
            Thank you for your business!
          </p>
        </div>

        {/* Print Styles */}
        <style>{`
          @media print {
            body { 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print { display: none !important; }
          }
        `}</style>
      </div>
    );
  }
);

InvoiceTemplate.displayName = 'InvoiceTemplate';

/**
 * Open the print dialog for an invoice
 */
export function printInvoice(contentRef: HTMLDivElement | null) {
  if (!contentRef) return;
  
  const printWindow = window.open('', '', 'width=800,height=600');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice</title>
        <style>
          body { 
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 0;
          }
          @media print {
            body { 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
      </head>
      <body>
        ${contentRef.outerHTML}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  
  // Wait for content to load before printing
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

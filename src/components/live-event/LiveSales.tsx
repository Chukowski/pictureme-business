import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, CreditCard, TrendingUp, Receipt, 
  RefreshCw, Calendar, FileText, Download
} from "lucide-react";
import { 
  getEventTransactions, 
  getTransactionSummary, 
  getTransaction,
  AlbumTransaction, 
  TransactionSummary 
} from "@/services/eventsApi";
import { ChargePOSModal } from "./ChargePOSModal";
import { InvoiceTemplate, printInvoice } from "./InvoiceTemplate";
import { formatDistanceToNow } from "date-fns";

interface LiveSalesProps {
  eventId?: number;
  eventConfig?: any;
}

export function LiveSales({ eventId, eventConfig }: LiveSalesProps) {
  const [transactions, setTransactions] = useState<AlbumTransaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [filter, setFilter] = useState<'today' | 'week' | 'all'>('today');
  const [selectedTransaction, setSelectedTransaction] = useState<AlbumTransaction | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const currency = eventConfig?.pricing?.currency || 'USD';
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';

  const loadData = useCallback(async () => {
    if (!eventId) return;
    
    setLoading(true);
    try {
      // Build filter dates
      let filters: { from?: string; to?: string } = {};
      const now = new Date();
      if (filter === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filters.from = startOfDay.toISOString();
      } else if (filter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filters.from = weekAgo.toISOString();
      }
      
      const [txResult, summaryResult] = await Promise.all([
        getEventTransactions(eventId, filters),
        getTransactionSummary(eventId),
      ]);
      
      setTransactions(txResult.transactions || []);
      setSummary(summaryResult);
    } catch (error) {
      console.error('Failed to load sales data:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId, filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChargeSuccess = () => {
    setIsChargeModalOpen(false);
    loadData(); // Refresh data after successful charge
  };

  const getPaymentMethodIcon = (method?: string) => {
    switch (method) {
      case 'card':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getPaymentMethodColor = (method?: string) => {
    switch (method) {
      case 'card':
        return 'bg-blue-500/10 text-blue-400';
      case 'stripe':
        return 'bg-purple-500/10 text-purple-400';
      default:
        return 'bg-emerald-500/10 text-emerald-400';
    }
  };

  const handlePrintInvoice = (tx: AlbumTransaction) => {
    setSelectedTransaction(tx);
    // Wait for state update and render, then print
    setTimeout(() => {
      if (invoiceRef.current) {
        printInvoice(invoiceRef.current);
      }
    }, 100);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Transactions List */}
      <Card className="bg-zinc-900/50 border-white/10 lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white text-base">Recent Transactions</CardTitle>
          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-black/30 rounded-lg p-1">
              {(['today', 'week', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    filter === f 
                      ? 'bg-white/10 text-white' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'All'}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={loadData}
              disabled={loading}
              className="h-8 w-8"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
              <p className="text-zinc-400">No transactions yet</p>
              <p className="text-xs text-zinc-500 mt-1">
                Use "Charge POS" to record a sale
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getPaymentMethodColor(tx.payment_method)}`}>
                      {getPaymentMethodIcon(tx.payment_method)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {tx.package_name || 'Album Purchase'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        {tx.album_code && (
                          <span className="font-mono">{tx.album_code}</span>
                        )}
                        {tx.visitor_name && (
                          <span>• {tx.visitor_name}</span>
                        )}
                        {tx.customer_name && (
                          <span>• {tx.customer_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">
                        {currencySymbol}{tx.total_amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePrintInvoice(tx)}
                      className="h-8 w-8 text-zinc-400 hover:text-white"
                      title="Download Invoice"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary & Actions */}
      <div className="space-y-4">
        {/* Today's Revenue */}
        <Card className="bg-zinc-900/50 border-white/10">
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400 mb-1">Today's Revenue</p>
            <h3 className="text-3xl font-bold text-white">
              {currencySymbol}{(summary?.today_revenue || 0).toFixed(2)}
            </h3>
            <div className="flex items-center gap-2 mt-2 text-xs text-zinc-400">
              <Calendar className="w-3 h-3" />
              <span>{summary?.today_transactions || 0} transactions today</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="bg-zinc-900/50 border-white/10">
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400 mb-1">Total Revenue</p>
            <h3 className="text-2xl font-bold text-white">
              {currencySymbol}{(summary?.total_revenue || 0).toFixed(2)}
            </h3>
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-zinc-400">
                {summary?.transaction_count || 0} total transactions
              </span>
              {(summary?.total_tax || 0) > 0 && (
                <span className="text-zinc-500">
                  Tax: {currencySymbol}{(summary?.total_tax || 0).toFixed(2)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={() => setIsChargeModalOpen(true)}
            className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Charge POS
          </Button>
          <Button 
            variant="outline" 
            className="h-12 border-white/10 text-zinc-300 hover:text-white hover:bg-white/5"
            disabled
          >
            <Receipt className="w-4 h-4 mr-2" />
            Invoice
          </Button>
        </div>

        {/* Stats Card */}
        <Card className="bg-zinc-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500">Paid Albums</p>
                <p className="text-lg font-bold text-white">{summary?.paid_albums_count || 0}</p>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                <TrendingUp className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charge POS Modal */}
      {eventId && (
        <ChargePOSModal
          open={isChargeModalOpen}
          onOpenChange={setIsChargeModalOpen}
          eventId={eventId}
          eventConfig={eventConfig}
          onSuccess={handleChargeSuccess}
        />
      )}

      {/* Hidden Invoice Template for Printing */}
      {selectedTransaction && (
        <div className="hidden">
          <InvoiceTemplate
            ref={invoiceRef}
            transaction={selectedTransaction}
            eventConfig={eventConfig}
          />
        </div>
      )}
    </div>
  );
}

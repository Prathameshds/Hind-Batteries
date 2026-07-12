import React, { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  IndianRupee,
  Calendar,
  User,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { database } from "../firebase";
import { ref, onValue, update } from "firebase/database";
import { Sale, Customer, Product } from "../types";
import { cn } from "../lib/utils";

interface CustomerGroup {
  customerId: string;
  customerName: string;
  customerMobile: string;
  totalBilled: number;
  totalPaid: number;
  totalBalance: number;
  sales: Sale[];
  status: 'paid' | 'partial' | 'unpaid';
}

export const TransactionsPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const salesRef = ref(database, "sales");
    const customersRef = ref(database, "customers");
    const productsRef = ref(database, "products");

    const unsubscribeSales = onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const salesList = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as any)
        })) as Sale[];
        setSales(salesList.sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()));
      }
      setLoading(false);
    });

    const unsubscribeCustomers = onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setCustomers(data);
    });

    const unsubscribeProducts = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setProducts(data);
    });

    return () => {
      unsubscribeSales();
      unsubscribeCustomers();
      unsubscribeProducts();
    };
  }, []);

  const handleUpdatePayment = async () => {
    if (!selectedSale || !paymentAmount) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const currentPaid = selectedSale.paid_amount || 0;
    const newTotalPaid = currentPaid + amount;
    
    if (newTotalPaid > selectedSale.selling_price) {
      alert("Payment amount exceeds balance!");
      return;
    }

    setIsUpdating(true);
    try {
      await update(ref(database, `sales/${selectedSale.id}`), {
        paid_amount: newTotalPaid
      });
      setSelectedSale(null);
      setPaymentAmount("");
    } catch (error) {
      console.error("Error updating payment:", error);
      alert("Failed to update payment");
    } finally {
      setIsUpdating(false);
    }
  };

  const getSaleStatus = (sale: Sale) => {
    const paid = sale.paid_amount || 0;
    const total = sale.selling_price;
    if (paid >= total) return 'paid';
    if (paid > 0) return 'partial';
    return 'unpaid';
  };

  // Group sales by customer
  const groupedTransactions: CustomerGroup[] = Object.values(
    sales.reduce((acc, sale) => {
      const custId = sale.customer_id;
      if (!acc[custId]) {
        const cust = customers[custId];
        acc[custId] = {
          customerId: custId,
          customerName: cust?.name || "Unknown Customer",
          customerMobile: cust?.mobile || "N/A",
          totalBilled: 0,
          totalPaid: 0,
          totalBalance: 0,
          sales: [],
          status: 'paid' as 'paid' | 'partial' | 'unpaid'
        };
      }
      const group = acc[custId];
      group.sales.push(sale);
      group.totalBilled += sale.selling_price;
      group.totalPaid += (sale.paid_amount || 0);
      group.totalBalance = group.totalBilled - group.totalPaid;
      return acc;
    }, {} as Record<string, CustomerGroup>)
  ).map((group: CustomerGroup) => {
    const statuses = group.sales.map((s: Sale) => getSaleStatus(s));
    if (statuses.every((s: string) => s === 'paid')) group.status = 'paid';
    else if (statuses.every((s: string) => s === 'unpaid')) group.status = 'unpaid';
    else group.status = 'partial';
    return group;
  });

  const filteredGroups = groupedTransactions.filter(group => {
    const searchMatch = (
      group.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.customerMobile.includes(searchTerm) ||
      group.sales.some((s: Sale) => s.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (statusFilter === 'all') return searchMatch;
    
    // For specific status, we show the group if the group matches the status 
    // OR if it has any single invoice that matches the status
    const hasStatusMatch = group.sales.some((s: Sale) => getSaleStatus(s) === statusFilter);
    return searchMatch && (group.status === statusFilter || hasStatusMatch);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-500 font-medium italic">Loading transactions...</div>;
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-slate-500 mt-1">Grouped by customer for easier balance management</p>
        </div>
      </header>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by customer, mobile, or invoice..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm md:col-span-2">
          {(['all', 'unpaid', 'partial', 'paid'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all capitalize",
                statusFilter === filter 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-6">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="text-slate-300" size={32} />
            </div>
            <p className="text-slate-500 font-medium">No transactions found matching your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredGroups.map((group) => (
              <motion.div
                key={group.customerId}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div 
                  className={cn(
                    "p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer hover:bg-slate-50 transition-colors",
                    expandedCustomerId === group.customerId && "bg-slate-50 border-b border-slate-100"
                  )}
                  onClick={() => setExpandedCustomerId(expandedCustomerId === group.customerId ? null : group.customerId)}
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-900 rounded-xl">
                        <User size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{group.customerName}</h3>
                        <p className="text-sm text-slate-500 font-medium">{group.customerMobile}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <span>{group.sales.length} Invoices</span>
                      <span>•</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded",
                        group.status === 'paid' ? "text-emerald-600 bg-emerald-50" : 
                        group.status === 'partial' ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50"
                      )}>
                        {group.status} Overall
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end gap-2">
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Total Bill</p>
                        <p className="text-lg font-black text-slate-900">₹{group.totalBilled.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Outstanding</p>
                        <p className={cn(
                          "text-xl font-black",
                          group.totalBalance > 0 ? "text-red-500" : "text-emerald-500"
                        )}>
                          ₹{group.totalBalance.toLocaleString()}
                        </p>
                      </div>
                      <div className={cn(
                        "transition-transform duration-300",
                        expandedCustomerId === group.customerId ? "rotate-90" : ""
                      )}>
                        <ChevronRight className="text-slate-300" size={24} />
                      </div>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedCustomerId === group.customerId && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 bg-slate-50/50 space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Invoice History</h4>
                        <div className="grid grid-cols-1 gap-3">
                          {group.sales.map((sale: Sale) => {
                            const product = products[sale.product_id];
                            const saleStatus = getSaleStatus(sale);
                            const balance = sale.selling_price - (sale.paid_amount || 0);

                            return (
                              <div 
                                key={sale.id}
                                className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-200 transition-colors group"
                              >
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                      {sale.invoice_number}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      {new Date(sale.purchase_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                    <ArrowRight size={12} className="text-slate-300 hidden sm:inline" />
                                    <span className="truncate">{product?.brand} {product?.model_name}</span>
                                  </p>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pt-3 md:pt-0 border-t md:border-0 border-slate-50">
                                  <div className="text-left md:text-right">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Due</p>
                                    <p className={cn(
                                      "text-sm font-black",
                                      balance > 0 ? "text-red-500" : "text-emerald-500"
                                    )}>
                                      ₹{balance.toLocaleString()}
                                    </p>
                                  </div>
                                  
                                  {balance > 0 ? (
                                    <button
                                      onClick={() => setSelectedSale(sale)}
                                      className="px-4 py-2 bg-slate-900 text-white text-xs font-black rounded-xl hover:shadow-lg transition-all active:scale-95 whitespace-nowrap"
                                    >
                                      Record Pay
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-2 rounded-xl whitespace-nowrap">
                                      <CheckCircle2 size={14} />
                                      Fully Paid
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Update Modal */}
      <AnimatePresence>
        {selectedSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => !isUpdating && setSelectedSale(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">Record Payment</h2>
                  <button 
                    onClick={() => setSelectedSale(null)}
                    disabled={isUpdating}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="text-slate-400" size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Invoice Context</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Invoice:</span>
                        <span className="font-mono font-bold text-slate-900">{selectedSale.invoice_number}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Total Bill:</span>
                        <span className="font-bold text-slate-900">₹{selectedSale.selling_price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Paid So Far:</span>
                        <span className="font-bold text-emerald-600">₹{(selectedSale.paid_amount || 0).toLocaleString()}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-slate-900 font-bold">Remaining:</span>
                        <span className="font-bold text-red-500">₹{(selectedSale.selling_price - (selectedSale.paid_amount || 0)).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold text-slate-700">New Payment Amount</label>
                      <button 
                        onClick={() => setPaymentAmount((selectedSale.selling_price - (selectedSale.paid_amount || 0)).toString())}
                        className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
                      >
                        Set Full Amount
                      </button>
                    </div>
                    <div className="relative">
                      <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="number"
                        placeholder="0.00"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-xl font-bold"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setSelectedSale(null)}
                      disabled={isUpdating}
                      className="flex-1 py-4 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdatePayment}
                      disabled={isUpdating || !paymentAmount}
                      className={cn(
                        "flex-2 py-4 bg-slate-900 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50",
                        isUpdating && "animate-pulse"
                      )}
                    >
                      {isUpdating ? "Updating..." : "Confirm Payment"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const X = ({ className, size, onClick }: any) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    onClick={onClick}
  >
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../firebase";
import { Sale, Product, Customer } from "../types";
import { ShieldCheck, ShieldAlert, Search, Calendar, User, Phone, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "../lib/utils";

export const WarrantyPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'expiring-soon'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onValue(ref(database), (snap) => {
      const data = snap.val();
      if (data) {
        setSales(Object.entries(data.sales || {}).map(([id, v]: [string, any]) => ({ id, ...v })));
        setProducts(data.products || {});
        setCustomers(data.customers || {});
      }
      setLoading(false);
    });
  }, []);

  const processedSales = sales.map(s => {
    const expiry = new Date(s.warranty_expiry_date);
    const now = new Date();
    const next30Days = new Date();
    next30Days.setDate(now.getDate() + 30);
    
    const isExpired = expiry < now;
    const isExpiringSoon = expiry > now && expiry <= next30Days;
    
    return {
      ...s,
      isExpired,
      isExpiringSoon,
      status: isExpired ? 'expired' : (isExpiringSoon ? 'expiring-soon' : 'active')
    };
  });

  const filteredSales = processedSales.filter(s => {
    const customer = customers[s.customer_id];
    const product = products[s.product_id];
    const matchesSearch = 
      customer?.name?.toLowerCase().includes(search.toLowerCase()) || 
      customer?.mobile?.includes(search) || 
      s.invoice_number?.toLowerCase().includes(search.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    return matchesSearch && s.status === filter;
  }).sort((a, b) => new Date(a.warranty_expiry_date).getTime() - new Date(b.warranty_expiry_date).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Warranty Tracker</h1>
        <p className="text-slate-500">Monitor and verify product warranty status</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search Invoice, Customer Name or Mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
          {(['all', 'active', 'expiring-soon', 'expired'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all",
                filter === f ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              {f.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
        {/* Mobile View (Cards) */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 font-medium">Loading warranty data...</div>
          ) : filteredSales.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-medium">No warranty records found.</div>
          ) : (
            filteredSales.map((s) => {
              const customer = customers[s.customer_id];
              const product = products[s.product_id];
              return (
                <div key={s.id} className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="font-black text-slate-900 leading-tight">{customer?.name}</div>
                      <div className="text-xs text-slate-500 font-medium">
                        {product?.brand} {product?.model_name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 uppercase tracking-tighter">
                        INV: {s.invoice_number}
                      </div>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                      s.status === 'active' ? "bg-green-100 text-green-700" :
                      s.status === 'expiring-soon' ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {s.status === 'active' && <CheckCircle2 size={10} />}
                      {s.status === 'expiring-soon' && <ShieldAlert size={10} />}
                      {s.status === 'expired' && <XCircle size={10} />}
                      {s.status.replace('-', ' ')}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Expires On</p>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(s.warranty_expiry_date).toLocaleDateString()}
                      </div>
                      {s.isExpiringSoon && (
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-tighter">Due Soon</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Contact</p>
                      <a 
                        href={`tel:${customer?.mobile}`}
                        className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
                      >
                        <Phone size={14} />
                        {customer?.mobile}
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Customer & Product</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Expiry Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">Loading warranty data...</td></tr>
              ) : filteredSales.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">No warranty records found.</td></tr>
              ) : (
                filteredSales.map((s) => {
                  const customer = customers[s.customer_id];
                  const product = products[s.product_id];
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{customer?.name}</div>
                        <div className="text-sm text-slate-500">{product?.brand} {product?.model_name} • <span className="font-mono text-[10px]">{s.invoice_number}</span></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider",
                          s.status === 'active' ? "bg-green-100 text-green-700" :
                          s.status === 'expiring-soon' ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {s.status === 'active' && <CheckCircle2 size={14} />}
                          {s.status === 'expiring-soon' && <ShieldAlert size={14} />}
                          {s.status === 'expired' && <XCircle size={14} />}
                          {s.status.replace('-', ' ')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-medium text-slate-700">
                          <Calendar size={16} className="text-slate-400" />
                          {new Date(s.warranty_expiry_date).toLocaleDateString()}
                        </div>
                        {s.isExpiringSoon && <div className="text-[10px] font-bold text-amber-600 mt-0.5">Expiring in less than 30 days</div>}
                      </td>
                      <td className="px-6 py-4">
                        <a 
                          href={`tel:${customer?.mobile}`}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 rounded-xl text-sm font-bold transition-all"
                        >
                          <Phone size={14} /> {customer?.mobile}
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

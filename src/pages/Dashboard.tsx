import React, { useState, useEffect } from "react";
import { ref, onValue, query, limitToLast } from "firebase/database";
import { database } from "../firebase";
import { Product, Customer, Sale } from "../types";
import { 
  Package, 
  Users, 
  TrendingUp, 
  ShieldAlert, 
  Clock,
  ArrowUpRight,
  Battery,
  Zap,
  Calculator,
  FileUp,
  Trash2,
  PieChart as PieIcon,
  BarChart as BarIcon,
  User
} from "lucide-react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Legend
} from "recharts";
import { cn } from "../lib/utils";
import { Link } from "react-router-dom";

export const DashboardPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('today');

  useEffect(() => {
    onValue(ref(database), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSales(Object.entries(data.sales || {}).map(([id, v]: [string, any]) => ({ id, ...v })));
        setCustomers(data.customers || {});
        setProducts(data.products || {});
      }
      setLoading(false);
    });
  }, []);

  const getFilteredSales = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return sales.filter(s => {
      const saleDate = new Date(s.purchase_date);
      if (timeFilter === 'today') return saleDate >= startOfToday;
      if (timeFilter === 'week') {
        const lastWeek = new Date();
        lastWeek.setDate(now.getDate() - 7);
        return saleDate >= lastWeek;
      }
      if (timeFilter === 'month') {
        const lastMonth = new Date();
        lastMonth.setMonth(now.getMonth() - 1);
        return saleDate >= lastMonth;
      }
      if (timeFilter === 'year') {
        const lastYear = new Date();
        lastYear.setFullYear(now.getFullYear() - 1);
        return saleDate >= lastYear;
      }
      return true;
    });
  };

  const filteredSales = getFilteredSales();
  const totalSalesVal = filteredSales.reduce((acc, s) => acc + s.selling_price, 0);
  const totalPaid = filteredSales.reduce((acc, s) => acc + (s.paid_amount || 0), 0);
  const totalBalance = totalSalesVal - totalPaid;
  const totalProfit = filteredSales.reduce((acc, s) => acc + s.margin_amount, 0);
  const totalScrapKg = filteredSales.reduce((acc, s) => acc + (s.scrap_weight_kg || 0), 0);
  const totalScrapVal = filteredSales.reduce((acc, s) => acc + (s.scrap_value || 0), 0);

  // Chart Data Preparation
  const productTypeData = filteredSales.reduce((acc: any[], sale) => {
    const product = products[sale.product_id];
    const type = product?.product_type || 'other';
    const existing = acc.find(item => item.name === type);
    if (existing) existing.value += 1;
    else acc.push({ name: type, value: 1 });
    return acc;
  }, []);

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'];

  const salesTrendData = filteredSales.reduce((acc: any[], sale) => {
    const date = new Date(sale.purchase_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.revenue += sale.selling_price;
      existing.profit += sale.margin_amount;
    } else {
      acc.push({ date, revenue: sale.selling_price, profit: sale.margin_amount });
    }
    return acc;
  }, []).slice(-7); // Last 7 days with activity

  const expiringWarranties = sales.filter(s => {
    const expiry = new Date(s.warranty_expiry_date);
    const now = new Date();
    const next30 = new Date();
    next30.setDate(now.getDate() + 30);
    return expiry > now && expiry <= next30;
  });

  if (loading) return <div className="p-8 text-center text-slate-400">Loading Dashboard...</div>;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
          <p className="text-slate-500">Business performance and scrap tracking</p>
        </div>
        <div className="flex bg-white p-1 border border-slate-200 rounded-2xl shadow-sm">
          {(['today', 'week', 'month', 'year', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all",
                timeFilter === f ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="p-3 bg-red-100 text-red-600 rounded-2xl w-fit mb-4"><Calculator size={24} /></div>
          <p className="text-sm font-medium text-slate-500">Outstanding</p>
          <h3 className="text-2xl font-bold text-slate-900">₹{totalBalance.toLocaleString()}</h3>
          <Link to="/transactions" className="text-xs text-blue-600 font-bold mt-1 hover:underline flex items-center gap-1">
            Manage Payments <ArrowUpRight size={12} />
          </Link>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl w-fit mb-4"><TrendingUp size={24} /></div>
          <p className="text-sm font-medium text-slate-500">Total Profit</p>
          <h3 className="text-2xl font-bold text-slate-900">₹{totalProfit.toLocaleString()}</h3>
          <p className="text-xs text-slate-400 mt-1">From {filteredSales.length} sales</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl w-fit mb-4"><ShieldAlert size={24} /></div>
          <p className="text-sm font-medium text-slate-500">Warranties</p>
          <h3 className="text-2xl font-bold text-slate-900">{expiringWarranties.length} Expiring</h3>
          <p className="text-xs text-slate-400 mt-1">Next 30 days</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl w-fit mb-4"><Package size={24} /></div>
          <p className="text-sm font-medium text-slate-500">Scrap Value</p>
          <h3 className="text-2xl font-bold text-slate-900">₹{totalScrapVal.toLocaleString()}</h3>
          <p className="text-xs text-slate-400 mt-1">{totalScrapKg} kg collected</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <PieIcon size={18} className="text-blue-500" />
            <h3 className="font-bold text-slate-900">Product Mix</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {productTypeData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarIcon size={18} className="text-emerald-500" />
            <h3 className="font-bold text-slate-900">Revenue & Profit Trend</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Recent Sales</h3>
            <Link to="/transactions" className="text-sm text-blue-600 font-bold hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {filteredSales.slice(0, 5).map((sale) => {
              const customer = customers[sale.customer_id];
              const product = products[sale.product_id];
              return (
                <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                      <User size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{customer?.name || "Unknown"}</p>
                      <p className="text-xs text-slate-400 uppercase font-mono">{sale.invoice_number}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900">₹{sale.selling_price.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">{new Date(sale.purchase_date).toLocaleDateString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-slate-900 mb-6">Financial Overview</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-500">Collected Revenue</span>
                <span className="text-sm font-bold text-emerald-600">₹{totalPaid.toLocaleString()}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full" 
                  style={{ width: `${(totalPaid / (totalSalesVal || 1)) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest text-right">
                {Math.round((totalPaid / (totalSalesVal || 1)) * 100)}% Collected
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Total Sales</p>
                  <p className="text-xl font-black text-slate-900">₹{totalSalesVal.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Total Margin</p>
                  <p className="text-xl font-black text-blue-600">₹{totalProfit.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Customers</span>
                <span className="font-bold text-slate-900">{Object.keys(customers).length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Inventory Items</span>
                <span className="font-bold text-slate-900">{Object.keys(products).length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Avg. Sale Value</span>
                <span className="font-bold text-slate-900">
                  ₹{Math.round(totalSalesVal / (filteredSales.length || 1)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scrap Analytics */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Trash2 className="text-amber-600" size={24} /> Scrap Collection Data
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-2xl">
              <p className="text-xs text-slate-500 uppercase font-bold">Total Weight</p>
              <p className="text-2xl font-bold text-slate-900">{totalScrapKg} KG</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl">
              <p className="text-xs text-slate-500 uppercase font-bold">Total Valuation</p>
              <p className="text-2xl font-bold text-slate-900">₹{totalScrapVal.toLocaleString()}</p>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-bold text-slate-700">Recent Scrap Exchanges</p>
            {filteredSales.filter(s => s.has_scrap).slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl text-sm">
                <div>
                  <div className="font-bold">{customers[s.customer_id]?.name || 'Unknown'}</div>
                  <div className="text-xs text-slate-500">{s.scrap_weight_kg} KG @ ₹{s.scrap_rate_per_kg}/KG</div>
                </div>
                <div className="font-bold text-amber-600">₹{s.scrap_value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Clock className="text-blue-600" size={24} /> Recent Sales Activity
          </h2>
          <div className="space-y-4">
            {filteredSales.slice(0, 6).map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                    {products[sale.product_id]?.product_type === 'inverter' ? <Zap size={18} /> : <Battery size={18} />}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{customers[sale.customer_id]?.name}</div>
                    <div className="text-xs text-slate-500">{products[sale.product_id]?.model_name} • {new Date(sale.purchase_date).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">₹{sale.selling_price.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">{sale.invoice_number}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

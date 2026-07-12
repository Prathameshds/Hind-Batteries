import React, { useState, useEffect } from "react";
import { ref, onValue, push, set, update } from "firebase/database";
import { database } from "../firebase";
import { Product } from "../types";
import { Plus, Search, FileUp, Loader2, Save, X, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";

export const InventoryPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<Product[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const productsRef = ref(database, "products");
    return onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val,
        }));
        setProducts(list);
      } else {
        setProducts([]);
      }
      setLoading(false);
    });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const response = await fetch("/api/parse-pricelist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileData: base64,
            mimeType: file.type,
            fileName: file.name
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setExtractedData(data);
          setIsModalOpen(true);
        } else {
          alert("Failed to parse file. Please try again.");
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert("Error uploading file");
    } finally {
      setIsUploading(false);
    }
  };

  const confirmImport = async () => {
    if (!extractedData) return;

    const now = new Date().toISOString();
    for (const p of extractedData) {
      // Check for duplicates
      const existing = products.find(ep => 
        ep.brand.toLowerCase() === p.brand.toLowerCase() && 
        ep.model_name.toLowerCase() === p.model_name.toLowerCase()
      );

      if (existing) {
        await update(ref(database, `products/${existing.id}`), {
          dp: p.dp,
          mrp: p.mrp,
          updated_at: now
        });
        // Log history logic could be added here
      } else {
        const newRef = push(ref(database, "products"));
        await set(newRef, {
          ...p,
          created_at: now,
          updated_at: now
        });
      }
    }
    setIsModalOpen(false);
    setExtractedData(null);
  };

  const [filterType, setFilterType] = useState<'all' | 'battery' | 'inverter'>('all');
  const [filterBrand, setFilterBrand] = useState('all');

  const brands = Array.from(new Set(products.map(p => p.brand)));

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.model_name.toLowerCase().includes(search.toLowerCase()) ||
      p.capacity.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = filterType === 'all' || p.product_type === filterType;
    const matchesBrand = filterBrand === 'all' || p.brand === filterBrand;

    return matchesSearch && matchesType && matchesBrand;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inventory Master</h1>
          <p className="text-slate-500">Search and filter your full product catalog</p>
        </div>
        <div className="flex items-center gap-3">
          <label className={cn(
            "flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl cursor-pointer hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 font-bold",
            isUploading && "opacity-50 cursor-not-allowed"
          )}>
            {isUploading ? <Loader2 className="animate-spin" size={20} /> : <FileUp size={20} />}
            AI Price List Import
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} accept="image/*,application/pdf" />
          </label>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search Brand, Model, Ampere..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        >
          <option value="all">All Types</option>
          <option value="battery">Batteries</option>
          <option value="inverter">Inverters</option>
        </select>
        <select 
          value={filterBrand}
          onChange={(e) => setFilterBrand(e.target.value)}
          className="bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        >
          <option value="all">All Brands</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <div className="md:col-span-2 bg-slate-900 text-white p-3 rounded-2xl shadow-sm flex items-center justify-between px-6">
          <span className="text-xs text-slate-400 uppercase font-bold">Total Results</span>
          <span className="text-xl font-bold">{filteredProducts.length}</span>
        </div>
      </div>

      {/* Product List */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {/* Mobile View (Cards) */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <Loader2 className="animate-spin inline-block mr-2" size={20} />
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No products found</div>
          ) : (
            filteredProducts.map((p) => (
              <div key={p.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={cn(
                      "inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-1",
                      p.product_type === 'battery' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {p.product_type}
                    </span>
                    <h3 className="font-bold text-slate-900">{p.brand} {p.model_name}</h3>
                    <p className="text-xs text-slate-500">{p.capacity} • {p.series || 'Standard'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">₹{p.dp.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">MRP: ₹{p.mrp.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Warranty</span>
                   <span className="text-xs font-bold text-slate-600">{p.warranty_months} Months</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product Info</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">DP (Dealer)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">MRP</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Warranty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="animate-spin inline-block mr-2" size={20} />
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No products found
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                        p.product_type === 'battery' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {p.product_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{p.brand} {p.model_name}</div>
                      <div className="text-sm text-slate-500">{p.capacity} • {p.series || 'Standard'}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                      ₹{p.dp.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-600">
                      ₹{p.mrp.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {p.warranty_months} Months
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Extraction Preview Modal */}
      {isModalOpen && extractedData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Confirm AI Import</h2>
                <p className="text-sm text-slate-500">Review extracted products before saving</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Extracted DP</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Extracted MRP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {extractedData.map((p, idx) => {
                    const existing = products.find(ep => 
                      ep.brand.toLowerCase() === p.brand.toLowerCase() && 
                      ep.model_name.toLowerCase() === p.model_name.toLowerCase()
                    );
                    return (
                      <tr key={idx}>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{p.brand} {p.model_name}</div>
                          <div className="text-xs text-slate-500">{p.product_type} • {p.capacity}</div>
                          {existing && (
                            <div className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mt-1">
                              <AlertCircle size={10} /> Existing Product (Price will update)
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-mono font-bold text-slate-900">₹{p.dp.toLocaleString()}</div>
                          {existing && (
                            <div className="text-xs text-slate-400 line-through">₹{existing.dp.toLocaleString()}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-mono font-bold text-slate-900">₹{p.mrp.toLocaleString()}</div>
                          {existing && (
                            <div className="text-xs text-slate-400 line-through">₹{existing.mrp.toLocaleString()}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button 
                onClick={confirmImport}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20"
              >
                Confirm & Save {extractedData.length} Products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { ref, onValue, push, set } from "firebase/database";
import { database, auth } from "../firebase";
import { Product, Sale, Customer, StoreSettings } from "../types";
import { 
  Search, 
  Calculator, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Trash2, 
  IndianRupee,
  Weight,
  Percent,
  FileText,
  UserPlus,
  Loader2,
  Users,
  ChevronRight,
  Plus,
  Printer
} from "lucide-react";
import { cn } from "../lib/utils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const CalculatorPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [step, setStep] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'battery' | 'inverter'>('all');
  const [filterBrand, setFilterBrand] = useState('all');
  
  // Step 2: DP Discount
  const [dpDiscount, setDpDiscount] = useState({ value: 0, type: 'percent' as 'percent' | 'amount' });
  
  // Step 3: Scrap
  const [hasScrap, setHasScrap] = useState(false);
  const [scrapWeight, setScrapWeight] = useState(0);
  const [scrapRate, setScrapRate] = useState(0);

  // Step 4: Margin
  const [marginAmount, setMarginAmount] = useState(0);

  // Step 5: Customer
  const [customer, setCustomer] = useState<Partial<Customer>>({ name: "", mobile: "", address: "" });
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [useExistingCustomer, setUseExistingCustomer] = useState(false);
  const [savingSale, setSavingSale] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [initialPaid, setInitialPaid] = useState<number>(0);

  useEffect(() => {
    onValue(ref(database), (snap) => {
      const data = snap.val();
      if (data) {
        setProducts(Object.entries(data.products || {}).map(([id, v]: [string, any]) => ({ id, ...v })));
        
        const custData = data.customers || {};
        const custs = Object.entries(custData).map(([id, v]: [string, any]) => ({ id, ...v })) as Customer[];
        setAllCustomers(custs.sort((a, b) => a.name.localeCompare(b.name)));
      }
    });

    onValue(ref(database, "settings"), (snap) => {
      const data = snap.val();
      if (data) {
        setSettings(data);
        setScrapRate(data.default_scrap_rate_per_kg || 85);
      }
    });
  }, []);

  const numberToWords = (num: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const numStr = num.toString();
    if (numStr.length > 9) return 'overflow';
    const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return ''; 
    let str = '';
    str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only ' : '';
    return str;
  }

  const generatePDF = () => {
    const doc = new jsPDF();

    const RED: [number, number, number] = [190, 0, 0];
    const BLACK: [number, number, number] = [0, 0, 0];
    const GRAY: [number, number, number] = [245, 245, 245];
    const TEXT_GRAY: [number, number, number] = [60, 60, 60];

    // --- 1. HEADER SECTION ---
    
    // Page Title
    doc.setFontSize(8);
    doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
    doc.text("BILLING INVOICE", 105, 10, { align: 'center' });

    // Store Name (Centered)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(RED[0], RED[1], RED[2]);
    doc.text("HIND BATTERIES & ELECTRICALS", 105, 30, { align: 'center' });

    // Slogan line (Centered)
    doc.setDrawColor(RED[0], RED[1], RED[2]);
    doc.setLineWidth(0.5);
    doc.line(60, 36, 72, 36);
    doc.line(138, 36, 150, 36);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("BATTERIES, INVERTERS & UPS", 105, 37, { align: 'center' });

    // Contact & Motto
    doc.setFontSize(11);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    // Phone icon placeholder
    doc.setFillColor(RED[0], RED[1], RED[2]);
    doc.circle(18, 52, 3, 'F');
    doc.text("9423808887 | 9970987599", 23, 53.5);
    
    doc.setFillColor(RED[0], RED[1], RED[2]);
    doc.circle(18, 62, 3, 'F');
    doc.setFontSize(9);
    doc.text("KARAD-VITA ROAD KADEGAON, sangli maharashtra, 415304", 23, 63.5);

    // INVOICE Header (Top Right)
    doc.setFontSize(11);
    doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
    doc.setFont("helvetica", "normal");
    doc.text("INVOICE NO.", 195, 48, { align: 'right' });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(RED[0], RED[1], RED[2]);
    doc.text(invoiceNumber || "0000000", 195, 55, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
    doc.setFont("helvetica", "normal");
    const displayDate = orderDate ? new Date(orderDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
    doc.text(`DATE: ${displayDate}`, 195, 63.5, { align: 'right' });

    doc.setDrawColor(200);
    doc.line(12, 72, 198, 72);

    // --- 2. CUSTOMER DETAILS ---
    const custY = 82;
    doc.setFontSize(11);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.setFont("helvetica", "normal");
    
    doc.text("Customer Name", 15, custY);
    doc.text(":", 58, custY);
    doc.line(62, custY + 1, 135, custY + 1);
    doc.setFont("helvetica", "bold");
    doc.text(customer.name || "", 62, custY);
    
    doc.setFont("helvetica", "normal");
    doc.text("Address", 15, custY + 10);
    doc.text(":", 58, custY + 10);
    doc.line(62, custY + 11, 135, custY + 11);
    doc.line(62, custY + 21, 135, custY + 21);
    doc.text(customer.address || "Kadegaon", 62, custY + 10);
    
    doc.text("Mobile Number", 15, custY + 30);
    doc.text(":", 58, custY + 30);
    doc.line(62, custY + 31, 135, custY + 31);
    doc.setFont("helvetica", "bold");
    doc.text(customer.mobile || "", 62, custY + 30);

    // --- 3. PRODUCT TABLE ---
    const itemRow = ['1', `${selectedProduct?.brand || ''} ${selectedProduct?.model_name || ''} (${selectedProduct?.capacity || ''})`.trim(), '1', `${mrp.toLocaleString()}`, `${sellingPrice.toLocaleString()}`];

    autoTable(doc, {
      startY: custY + 40,
      head: [['Sr.', 'Description of Goods', 'Qty', 'MRP', 'Amount']],
      body: [itemRow],
      theme: 'grid',
      styles: { lineColor: [180, 180, 180], lineWidth: 0.2 },
      headStyles: {
        fillColor: RED,
        textColor: 255,
        fontSize: 11,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 10,
        textColor: BLACK,
        cellPadding: 4,
        minCellHeight: 10
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 80 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'center', cellWidth: 30 },
        4: { halign: 'center', cellWidth: 30, fontStyle: 'bold' }
      },
    });

    // --- 4. GRAND TOTAL ---
    const finalY = (doc as any).lastAutoTable.finalY + 5;
    
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.roundedRect(12, finalY, 186, 16, 2, 2, 'S');
    
    doc.setFillColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.rect(12.5, finalY + 0.5, 115, 15, 'F');
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text("GRAND TOTAL", 70, finalY + 10, { align: 'center' });
    
    doc.line(128, finalY, 128, finalY + 16);
    
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text(sellingPrice.toLocaleString(), 190, finalY + 10, { align: 'right' });
    doc.line(148, finalY + 12, 192, finalY + 12);

    // --- 5. FOOTER ---
    const sigY = finalY + 30;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text("Authorized Signature", 195, sigY, { align: 'right' });
    
    doc.setDrawColor(150);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(165, sigY + 8, 195, sigY + 8);
    doc.setLineDashPattern([], 0);

    const thanksY = sigY + 20;
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(16);
    doc.setTextColor(RED[0], RED[1], RED[2]);
    doc.text(". . . Thank You for Visiting! . . .", 105, thanksY, { align: 'center' });

    // Page Border
    doc.setDrawColor(150);
    doc.setLineWidth(0.3);
    doc.rect(5, 5, 200, 287, 'S');

    doc.save(`Hind_Battery_Invoice_${invoiceNumber}.pdf`);
  };

  const handleSaveSale = async () => {
    if (!selectedProduct || !customer.name || !customer.mobile) return;
    setSavingSale(true);
    try {
      let finalCustomerId = customer.id;
      const now = new Date().toISOString();
      const saleDate = new Date(orderDate).toISOString();

      if (!finalCustomerId) {
        const custRef = push(ref(database, "customers"));
        finalCustomerId = custRef.key!;
        await set(custRef, { ...customer, created_at: now });
      }

      const saleId = push(ref(database, "sales")).key;
      const invNum = `HB-${Date.now().toString().slice(-6)}`;
      setInvoiceNumber(invNum);

      const warrantyExpiry = new Date(orderDate);
      warrantyExpiry.setMonth(warrantyExpiry.getMonth() + (selectedProduct.warranty_months || 0));

      const saleData: Sale = {
        customer_id: finalCustomerId,
        product_id: selectedProduct.id!,
        mrp,
        original_dp: originalDp,
        dp_discount_amount: dpDiscountAmount,
        new_dp: newDp,
        has_scrap: hasScrap,
        scrap_weight_kg: scrapWeight,
        scrap_rate_per_kg: scrapRate,
        scrap_value: scrapValue,
        effective_dp: effectiveDp,
        margin_amount: marginAmount,
        margin_percent: marginPercent,
        selling_price: sellingPrice,
        customer_saving_amount: customerSavingAmount,
        customer_saving_percent: customerSavingPercent,
        purchase_date: saleDate,
        warranty_expiry_date: warrantyExpiry.toISOString(),
        invoice_number: invNum,
        paid_amount: initialPaid,
        created_by: auth.currentUser?.uid || "unknown",
        created_at: now
      };

      await set(ref(database, `sales/${saleId}`), saleData);
      setStep(6);
    } catch (err) {
      console.error(err);
      alert("Failed to save sale");
    } finally {
      setSavingSale(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.brand.toLowerCase().includes(search.toLowerCase()) || 
      p.model_name.toLowerCase().includes(search.toLowerCase()) ||
      p.capacity.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = filterType === 'all' || p.product_type === filterType;
    const matchesBrand = filterBrand === 'all' || p.brand === filterBrand;

    return matchesSearch && matchesType && matchesBrand;
  });

  const brands = Array.from(new Set(products.map(p => p.brand)));

  // Calculations
  const originalDp = selectedProduct?.dp || 0;
  const mrp = selectedProduct?.mrp || 0;
  
  const dpDiscountAmount = dpDiscount.type === 'percent' 
    ? (originalDp * dpDiscount.value) / 100 
    : dpDiscount.value;
  
  const newDp = originalDp - dpDiscountAmount;
  const scrapValue = hasScrap ? scrapWeight * scrapRate : 0;
  const effectiveDp = newDp - scrapValue;
  
  const sellingPrice = effectiveDp + marginAmount;
  const marginPercent = effectiveDp > 0 ? (marginAmount / effectiveDp) * 100 : 0;
  
  const customerSavingAmount = mrp - sellingPrice;
  const customerSavingPercent = mrp > 0 ? (customerSavingAmount / mrp) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header & Steps */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sales Calculator</h1>
          <p className="text-slate-500">Guided pricing engine for batteries and inverters</p>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <div 
              key={s} 
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                step === s ? "bg-blue-600 text-white scale-110 shadow-lg shadow-blue-500/20" : 
                step > s ? "bg-green-500 text-white" : "bg-slate-200 text-slate-400"
              )}
            >
              {step > s ? "✓" : s}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 min-h-[400px]">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-xl font-bold text-slate-800">1. Select Product</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-3 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search Brand, Model, Capacity..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="battery">Batteries</option>
                    <option value="inverter">Inverters</option>
                  </select>

                  <select 
                    value={filterBrand}
                    onChange={(e) => setFilterBrand(e.target.value)}
                    className="bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                  >
                    <option value="all">All Brands</option>
                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>

                  <div className="flex items-center justify-between px-4 bg-slate-100 rounded-2xl text-xs font-bold text-slate-500">
                    <span>{filteredProducts.length} Results</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredProducts.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">No products match your filters.</div>
                  ) : (
                    filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProduct(p); setStep(2); }}
                        className={cn(
                          "p-4 rounded-2xl border text-left transition-all",
                          selectedProduct?.id === p.id ? "border-blue-500 bg-blue-50" : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900">{p.brand} {p.model_name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                              <span className="bg-slate-200 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">{p.product_type}</span>
                              {p.capacity} • {p.warranty_months} Mo Warranty
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-400">MRP</div>
                            <div className="font-bold text-slate-900">₹{p.mrp.toLocaleString()}</div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h2 className="text-xl font-bold text-slate-800">2. Dealer Discount</h2>
                <p className="text-sm text-slate-500">How much discount did the owner get on DP?</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setDpDiscount({ ...dpDiscount, type: 'percent' })}
                    className={cn("flex-1 py-3 rounded-xl font-bold transition-all", dpDiscount.type === 'percent' ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500")}
                  >
                    Percentage (%)
                  </button>
                  <button 
                    onClick={() => setDpDiscount({ ...dpDiscount, type: 'amount' })}
                    className={cn("flex-1 py-3 rounded-xl font-bold transition-all", dpDiscount.type === 'amount' ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500")}
                  >
                    Fixed Amount (₹)
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {dpDiscount.type === 'percent' ? <Percent size={20} /> : <IndianRupee size={20} />}
                  </div>
                  <input
                    type="number"
                    value={dpDiscount.value || ""}
                    onChange={(e) => setDpDiscount({ ...dpDiscount, value: Number(e.target.value) })}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-2xl font-bold outline-none"
                    placeholder="0"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 flex items-center justify-center gap-2">
                    <ArrowLeft size={18} /> Back
                  </button>
                  <button onClick={() => setStep(3)} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
                    Next Step <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-800">3. Scrap Exchange</h2>
                  <button 
                    onClick={() => setHasScrap(!hasScrap)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-bold transition-all",
                      hasScrap ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {hasScrap ? "YES (Exchanging)" : "NO (No Exchange)"}
                  </button>
                </div>

                {hasScrap ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">Scrap Weight (KG)</label>
                      <div className="relative">
                        <Weight className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                          type="number"
                          value={scrapWeight || ""}
                          onChange={(e) => setScrapWeight(Number(e.target.value))}
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-bold outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">Rate per KG (₹)</label>
                      <div className="relative">
                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                          type="number"
                          value={scrapRate || ""}
                          onChange={(e) => setScrapRate(Number(e.target.value))}
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-bold outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                    <Trash2 className="mx-auto mb-2 opacity-20" size={48} />
                    <p>No scrap battery exchange for this sale.</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 flex items-center justify-center gap-2">
                    <ArrowLeft size={18} /> Back
                  </button>
                  <button onClick={() => setStep(4)} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
                    Next Step <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h2 className="text-xl font-bold text-slate-800">4. Desired Margin</h2>
                <p className="text-sm text-slate-500">How much profit do you want to keep? (in ₹)</p>
                <div className="relative">
                  <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="number"
                    value={marginAmount || ""}
                    onChange={(e) => setMarginAmount(Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-3xl font-bold outline-none text-green-600"
                    placeholder="0"
                  />
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-500">Effective Margin:</span>
                  <span className="text-lg font-bold text-slate-900">{marginPercent.toFixed(2)}%</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(3)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 flex items-center justify-center gap-2">
                    <ArrowLeft size={18} /> Back
                  </button>
                  <button onClick={() => setStep(5)} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
                    Next Step <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800">5. Customer Details</h2>
                    {useExistingCustomer && (
                      <button onClick={() => setUseExistingCustomer(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">
                        ← Back to Form
                      </button>
                    )}
                  </div>
                  
                  {!useExistingCustomer && allCustomers.length > 0 && (
                    <button 
                      onClick={() => setUseExistingCustomer(true)}
                      className="w-full p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl flex items-center justify-between group hover:bg-blue-100 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 text-white rounded-lg">
                          <Users size={18} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-blue-900">Select Existing Customer</p>
                          <p className="text-xs text-blue-600">{allCustomers.length} customers in database</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>

                {useExistingCustomer ? (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Search by name or mobile..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        autoFocus
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {allCustomers
                        .filter(c => 
                          c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
                          c.mobile.includes(customerSearch)
                        )
                        .map(c => (
                          <button
                            key={c.id}
                            onClick={() => { 
                              setCustomer({
                                id: c.id,
                                name: c.name,
                                mobile: c.mobile,
                                address: c.address || "",
                                city: c.city || "Kadegaon"
                              }); 
                              setUseExistingCustomer(false);
                              setCustomerSearch("");
                            }}
                            className="p-4 border-2 border-slate-100 bg-white rounded-2xl text-left hover:border-blue-500 hover:bg-blue-50 transition-all group shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 truncate">{c.name}</div>
                                <div className="text-xs text-slate-500 font-medium">{c.mobile}</div>
                                {c.address && <div className="text-[10px] text-slate-400 truncate mt-1">{c.address}</div>}
                              </div>
                              <UserPlus size={18} className="text-slate-300 group-hover:text-blue-600 shrink-0" />
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Customer Name</label>
                        <input
                          type="text"
                          value={customer.name || ""}
                          onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                          placeholder="Full Name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Mobile Number</label>
                        <input
                          type="tel"
                          value={customer.mobile || ""}
                          onChange={(e) => setCustomer({ ...customer, mobile: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                          placeholder="10 digit number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Order Date</label>
                        <input
                          type="date"
                          value={orderDate}
                          onChange={(e) => setOrderDate(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Initial Payment (Advance)</label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="number"
                            value={initialPaid || ""}
                            onChange={(e) => setInitialPaid(Number(e.target.value))}
                            className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-green-600"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">Address</label>
                      <input
                        type="text"
                        value={customer.address || ""}
                        onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                        placeholder="Street, City, Area (e.g. Kadegaon)"
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setStep(4)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600">
                    Back
                  </button>
                  <button 
                    onClick={handleSaveSale} 
                    disabled={savingSale || !customer.name || !customer.mobile}
                    className="flex-[2] py-4 bg-green-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 disabled:opacity-50"
                  >
                    {savingSale ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
                    Finalize & Print Invoice
                  </button>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="text-center space-y-6 animate-in zoom-in-95 duration-500 py-8">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 size={48} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Sale Recorded!</h2>
                  <p className="text-slate-500">Invoice <span className="font-bold text-slate-900">{invoiceNumber}</span> is ready.</p>
                </div>
                <div className="flex flex-col gap-3 max-w-sm mx-auto">
                  <button onClick={generatePDF} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl">
                    <Printer size={18} /> Print Current Bill
                  </button>
                  
                  <button 
                    onClick={() => {
                      setSelectedProduct(null);
                      setStep(1);
                      setSearch("");
                    }} 
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Plus size={18} /> Add Another Item for {customer.name}
                  </button>

                  <button onClick={() => window.location.reload()} className="w-full py-4 border border-slate-200 rounded-2xl font-bold text-slate-600">
                    Finish & Exit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Summary Area */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl sticky top-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Calculator size={20} className="text-blue-400" />
              Live Breakdown
            </h3>
            
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-slate-800 pb-3">
                <span className="text-slate-400">Original DP</span>
                <span className="font-mono font-bold">₹{originalDp.toLocaleString()}</span>
              </div>
              
              {dpDiscountAmount > 0 && (
                <div className="flex justify-between border-b border-slate-800 pb-3 text-red-400">
                  <span className="text-slate-400">DP Discount</span>
                  <span className="font-mono font-bold">-₹{dpDiscountAmount.toLocaleString()}</span>
                </div>
              )}

              {scrapValue > 0 && (
                <div className="flex justify-between border-b border-slate-800 pb-3 text-red-400">
                  <span className="text-slate-400">Scrap Value ({scrapWeight}kg)</span>
                  <span className="font-mono font-bold">-₹{scrapValue.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between border-b border-slate-800 pb-3 font-bold text-blue-400">
                <span className="text-slate-400">Effective DP</span>
                <span className="font-mono">₹{effectiveDp.toLocaleString()}</span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-3 text-green-400">
                <span className="text-slate-400">Dealer Margin</span>
                <span className="font-mono font-bold">+₹{marginAmount.toLocaleString()}</span>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-800">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Final Selling Price</div>
                <div className="text-4xl font-bold text-white mb-4">₹{sellingPrice.toLocaleString()}</div>
                
                <div className="space-y-2 pt-4 border-t border-slate-800/50">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Paid Now</span>
                    <span className="text-green-400 font-bold">₹{initialPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Balance Due</span>
                    <span className={cn(
                      "text-xl font-bold",
                      (sellingPrice - initialPaid) > 0 ? "text-red-400" : "text-emerald-400"
                    )}>
                      ₹{(sellingPrice - initialPaid).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-blue-600/20 border border-blue-500/30 rounded-2xl">
                <div className="text-xs text-blue-300 uppercase tracking-wider mb-2 font-bold">Customer Savings</div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-300">Vs MRP (₹{mrp.toLocaleString()})</span>
                  <span className="text-xl font-bold">₹{customerSavingAmount.toLocaleString()}</span>
                </div>
                <div className="text-sm font-bold text-blue-400 bg-white/10 rounded-lg px-3 py-1.5 inline-block">
                  {customerSavingPercent.toFixed(2)}% OFF
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
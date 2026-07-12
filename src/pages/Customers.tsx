import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../firebase";
import { Customer, Sale, Product } from "../types";
import { Search, User, History, Phone, MapPin, Calendar, ExternalLink } from "lucide-react";
import { cn } from "../lib/utils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onValue(ref(database), (snap) => {
      const data = snap.val();
      if (data) {
        setCustomers(Object.entries(data.customers || {}).map(([id, v]: [string, any]) => ({ id, ...v })));
        setSales(Object.entries(data.sales || {}).map(([id, v]: [string, any]) => ({ id, ...v })));
        setProducts(data.products || {});
      }
      setLoading(false);
    });
  }, []);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.mobile.includes(search)
  );

  const customerSales = sales
    .filter(s => s.customer_id === selectedCustomer?.id)
    .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());

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

  const generatePDF = (salesToBill: Sale[], c: Customer) => {
    const doc = new jsPDF();

    const RED: [number, number, number] = [190, 0, 0];
    const BLACK: [number, number, number] = [0, 0, 0];
    const GRAY: [number, number, number] = [245, 245, 245];
    const TEXT_GRAY: [number, number, number] = [60, 60, 60];

    const isMultiple = salesToBill.length > 1;
    const invLabel = isMultiple ? `COMB-${Date.now().toString().slice(-4)}` : salesToBill[0].invoice_number;

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

    doc.setDrawColor(RED[0], RED[1], RED[2]);
    doc.setLineWidth(0.5);
    doc.line(60, 36, 72, 36);
    doc.line(138, 36, 150, 36);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("BATTERIES, INVERTERS & UPS", 105, 37, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.setFillColor(RED[0], RED[1], RED[2]);
    doc.circle(18, 52, 3, 'F');
    doc.text("9423808887 | 9970987599", 23, 53.5);
    doc.circle(18, 62, 3, 'F');
    doc.setFontSize(9);
    doc.text("KARAD-VITA ROAD KADEGAON, sangli maharashtra, 415304", 23, 63.5);

    // Header (Top Right)
    doc.setFontSize(11);
    doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
    doc.setFont("helvetica", "normal");
    doc.text("INVOICE NO.", 195, 48, { align: 'right' });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(RED[0], RED[1], RED[2]);
    doc.text(invLabel, 195, 55, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
    doc.setFont("helvetica", "normal");
    doc.text(`DATE: ${new Date(salesToBill[0].purchase_date).toLocaleDateString('en-GB')}`, 195, 63.5, { align: 'right' });

    doc.setDrawColor(200);
    doc.line(12, 72, 198, 72);

    // --- 2. CUSTOMER DETAILS ---
    const custY = 82;
    doc.setFontSize(11);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    
    doc.text("Customer Name", 15, custY);
    doc.text(":", 58, custY);
    doc.line(62, custY + 1, 135, custY + 1);
    doc.setFont("helvetica", "bold");
    doc.text(c.name, 62, custY);
    
    doc.setFont("helvetica", "normal");
    doc.text("Address", 15, custY + 10);
    doc.text(":", 58, custY + 10);
    doc.line(62, custY + 11, 135, custY + 11);
    doc.line(62, custY + 21, 135, custY + 21);
    doc.text(c.address || "Kadegaon", 62, custY + 10);
    
    doc.text("Mobile Number", 15, custY + 30);
    doc.text(":", 58, custY + 30);
    doc.line(62, custY + 31, 135, custY + 31);
    doc.setFont("helvetica", "bold");
    doc.text(c.mobile, 62, custY + 30);

    // --- 3. PRODUCT TABLE ---
    const tableRows = salesToBill.map((s, idx) => {
      const p = products[s.product_id];
      return [
        (idx + 1).toString(),
        `${p?.brand} ${p?.model_name}\n${p?.capacity}`,
        '1',
        `${s.mrp.toLocaleString()}`,
        `${s.selling_price.toLocaleString()}`
      ];
    });

    autoTable(doc, {
      startY: custY + 40,
      head: [['Sr.', 'Description of Goods', 'Qty', 'MRP', 'Amount']],
      body: tableRows,
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
    const totalSellingPrice = salesToBill.reduce((sum, s) => sum + s.selling_price, 0);
    
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
    doc.text(totalSellingPrice.toLocaleString(), 190, finalY + 10, { align: 'right' });
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

    doc.setDrawColor(150);
    doc.setLineWidth(0.3);
    doc.rect(5, 5, 200, 287, 'S');

    doc.save(`Hind_Battery_${invLabel}.pdf`);
  };

  const groupSalesByDate = (salesList: Sale[]) => {
    const groups: Record<string, Sale[]> = {};
    salesList.forEach(s => {
      const date = new Date(s.purchase_date).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(s);
    });
    return groups;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500">View and manage your customer database</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Customer List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search Name or Mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm max-h-[600px] overflow-y-auto">
            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Loading customers...</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No customers found.</div>
              ) : (
                filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className={cn(
                      "w-full p-4 flex items-center gap-4 text-left transition-colors",
                      selectedCustomer?.id === c.id ? "bg-blue-50 border-r-4 border-blue-600" : "hover:bg-slate-50"
                    )}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                      <User size={24} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{c.name}</div>
                      <div className="text-sm text-slate-500">{c.mobile}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Customer Detail & History */}
        <div className="lg:col-span-2">
          {selectedCustomer ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              {/* Profile Card */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="w-24 h-24 rounded-3xl bg-blue-600 flex items-center justify-center text-white text-3xl font-bold shrink-0 shadow-lg shadow-blue-500/20">
                    {selectedCustomer.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-3xl font-bold text-slate-900">{selectedCustomer.name}</h2>
                      <p className="text-slate-500">Customer since {new Date(selectedCustomer.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 text-slate-600">
                        <Phone size={18} className="text-slate-400" />
                        <span>{selectedCustomer.mobile}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600">
                        <MapPin size={18} className="text-slate-400" />
                        <span>{selectedCustomer.address || "No address provided"}, {selectedCustomer.city}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchase History */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <History size={20} className="text-blue-600" />
                  Purchase History
                </h3>
                
                <div className="space-y-8">
                  {customerSales.length === 0 ? (
                    <div className="bg-white p-12 text-center text-slate-400 border border-slate-200 rounded-3xl">
                      No purchases found for this customer.
                    </div>
                  ) : (
                    Object.entries(groupSalesByDate(customerSales)).map(([date, salesList]) => (
                      <div key={date} className="space-y-3">
                        <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-2 font-bold text-slate-500 text-sm">
                            <Calendar size={16} />
                            {date}
                          </div>
                          {salesList.length > 1 && (
                            <button 
                              onClick={() => generatePDF(salesList, selectedCustomer)}
                              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-xl font-bold shadow-sm hover:bg-blue-700 transition-colors"
                            >
                              Get Combined Bill ({salesList.length} items)
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {salesList.map((s) => {
                            const p = products[s.product_id];
                            const isUnderWarranty = new Date(s.warranty_expiry_date) > new Date();
                            return (
                              <div key={s.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                  <div>
                                    <div className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Invoice {s.invoice_number}</div>
                                    <h4 className="text-lg font-bold text-slate-900">{p?.brand} {p?.model_name}</h4>
                                    <p className="text-sm text-slate-500">{p?.capacity} • {p?.warranty_months} Months Warranty</p>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-2xl font-bold text-slate-900">₹{s.selling_price.toLocaleString()}</div>
                                    <span className={cn(
                                      "inline-flex px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider mt-1",
                                      isUnderWarranty ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                    )}>
                                      {isUnderWarranty ? "✅ Under Warranty" : "❌ Expired"}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Ends</div>
                                    <div className="text-sm font-semibold">{new Date(s.warranty_expiry_date).toLocaleDateString()}</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Scrap Val</div>
                                    <div className="text-sm font-semibold">₹{s.scrap_value.toLocaleString()}</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Saving</div>
                                    <div className="text-sm font-semibold text-green-600">₹{s.customer_saving_amount.toLocaleString()}</div>
                                  </div>
                                  <div className="flex justify-end items-end">
                                    <button 
                                      onClick={() => generatePDF([s], selectedCustomer)}
                                      className="text-blue-600 hover:text-blue-700 text-sm font-bold flex items-center gap-1"
                                    >
                                      Bill <ExternalLink size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-[40px]">
              <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <User size={40} className="opacity-20" />
              </div>
              <h3 className="text-lg font-bold text-slate-400">No Customer Selected</h3>
              <p className="max-w-xs mx-auto text-sm">Select a customer from the list to view their full profile and purchase history.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

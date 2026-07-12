import React, { useState, useEffect } from "react";
import { ref, onValue, set, update } from "firebase/database";
import { database } from "../firebase";
import { StoreSettings } from "../types";
import { Save, Building2, Phone, MapPin, IndianRupee, FileText, CheckCircle2 } from "lucide-react";

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings>({
    default_scrap_rate_per_kg: 85,
    store_name: "",
    store_address: "",
    store_phone: "",
    store_gst_number: "",
    logo_url: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    onValue(ref(database, "settings"), (snap) => {
      const data = snap.val();
      if (data) {
        setSettings(prev => ({ ...prev, ...data }));
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await set(ref(database, "settings"), settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading settings...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Admin Settings</h1>
        <p className="text-slate-500">Configure your store profile and calculation defaults</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Store Profile Section */}
        <div className="bg-white rounded-[40px] p-8 md:p-10 border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Building2 size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Store Profile</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Store Name</label>
              <input
                type="text"
                value={settings.store_name}
                onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="e.g. Hind Battery & Inverters"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Contact Phone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={settings.store_phone}
                  onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })}
                  className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">GST Number (Optional)</label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={settings.store_gst_number}
                  onChange={(e) => setSettings({ ...settings, store_gst_number: e.target.value })}
                  className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Store Address</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 text-slate-400" size={18} />
                <textarea
                  value={settings.store_address}
                  onChange={(e) => setSettings({ ...settings, store_address: e.target.value })}
                  rows={3}
                  className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Defaults Section */}
        <div className="bg-white rounded-[40px] p-8 md:p-10 border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <IndianRupee size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Calculation Defaults</h2>
          </div>

          <div className="max-w-xs">
            <label className="block text-sm font-bold text-slate-700 mb-2">Default Scrap Rate (per KG)</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
              <input
                type="number"
                value={settings.default_scrap_rate_per_kg}
                onChange={(e) => setSettings({ ...settings, default_scrap_rate_per_kg: Number(e.target.value) })}
                className="w-full pl-10 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all text-xl font-bold"
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">This rate will be auto-filled in the Sales Calculator.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-4">
          {success && (
            <span className="text-green-600 font-bold text-sm flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
              <CheckCircle2 size={18} /> Settings saved successfully!
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-10 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98] disabled:bg-slate-400 flex items-center gap-2"
          >
            {saving ? "Saving..." : <><Save size={20} /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
};

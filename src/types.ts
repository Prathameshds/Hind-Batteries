export type ProductType = 'battery' | 'inverter';
export type UserRole = 'super_admin' | 'staff';

export interface Product {
  id?: string;
  product_type: ProductType;
  brand: string;
  series?: string;
  model_name: string;
  capacity: string;
  warranty_months: number;
  dp: number;
  mrp: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id?: string;
  name: string;
  mobile: string;
  alternate_mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  created_at: string;
}

export interface Sale {
  id?: string;
  customer_id: string;
  product_id: string;
  mrp: number;
  original_dp: number;
  dp_discount_amount: number;
  new_dp: number;
  has_scrap: boolean;
  scrap_weight_kg: number;
  scrap_rate_per_kg: number;
  scrap_value: number;
  effective_dp: number;
  margin_amount: number;
  margin_percent: number;
  selling_price: number;
  customer_saving_amount: number;
  customer_saving_percent: number;
  purchase_date: string;
  warranty_expiry_date: string;
  invoice_number: string;
  paid_amount?: number;
  created_by: string;
  created_at: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface StoreSettings {
  default_scrap_rate_per_kg: number;
  store_name: string;
  store_address: string;
  store_phone: string;
  store_gst_number: string;
  logo_url: string;
}

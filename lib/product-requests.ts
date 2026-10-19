// "طلب منتج غير مدرج": data layer. REAL mode uses Supabase (table product_requests + private bucket request-images);
// DEMO mode keeps everything in this browser (localStorage) so the feature can be tried without a database.
import { supabase, isSupabaseConfigured } from "@/lib/supabase-client";

export type RequestStatus =
  | "new" | "contacting_store" | "store_confirmed" | "offer_sent" | "approved" | "purchased" | "rejected" | "cancelled";

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  new: "جديد",
  contacting_store: "نتواصل مع المتجر",
  store_confirmed: "المتجر أكد التوفر",
  offer_sent: "عرض التقسيط جاهز",
  approved: "تمت الموافقة",
  purchased: "تم الشراء",
  rejected: "تعذر التوفير",
  cancelled: "ملغي",
};

export const REQUEST_STATUS_COLOR: Record<RequestStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  contacting_store: "bg-amber-100 text-amber-800",
  store_confirmed: "bg-teal-100 text-teal-800",
  offer_sent: "bg-orange-100 text-orange-800",
  approved: "bg-green-100 text-green-800",
  purchased: "bg-emerald-200 text-emerald-900",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-neutral-100 text-neutral-600",
};

export const OPEN_STATUSES: RequestStatus[] = ["new", "contacting_store", "store_confirmed", "offer_sent"];
export const REQUEST_MONTHS = [6, 9, 12, 18, 24] as const;

export interface ProductRequest {
  id: string;
  requestNumber: string;
  userId: string;
  fullName: string;
  phone: string;
  productName: string;
  productUrl: string | null;
  /** Storage path (real) or data URL (demo). Use requestImageSrc() to display it. */
  image: string | null;
  storeName: string;
  storeCity: string;
  storePhone: string;
  estimatedPrice: number | null;
  quantity: number;
  months: number | null;
  notes: string;
  status: RequestStatus;
  adminNote: string;
  quotedPrice: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewRequestInput {
  productName: string;
  productUrl: string;
  storeName: string;
  storeCity: string;
  storePhone: string;
  estimatedPrice: string;
  quantity: number;
  months: number | null;
  notes: string;
  image: File | null;
}

export interface Requester { id: string; fullName: string; phone: string }

const DEMO_KEY = "qistuha-demo-product-requests";
export const requestsAreDemo = !isSupabaseConfigured;

/** Fails with an Arabic message when the form is not acceptable. */
export function validateRequest(i: NewRequestInput): string | null {
  if (i.productName.trim().length < 2) return "اكتب اسم المنتج";
  const url = i.productUrl.trim();
  if (!url && !i.image) return "أرسل رابط المنتج أو صورته (واحد منهما على الأقل)";
  if (url && !/^https?:\/\/\S+$/i.test(url)) return "الرابط يجب أن يبدأ بـ http:// أو https://";
  if (i.image) {
    if (!/^image\/(jpeg|png|webp)$/.test(i.image.type)) return "الصور المقبولة: JPG أو PNG أو WebP";
    if (i.image.size > 5 * 1024 * 1024) return "حجم الصورة يتجاوز 5 ميجابايت";
  }
  if (i.estimatedPrice.trim() && !(Number(i.estimatedPrice) > 0)) return "السعر التقريبي غير صحيح";
  if (i.notes.length > 2000) return "الملاحظات طويلة جدًا";
  return null;
}

// ---------- mapping ----------
type Row = Record<string, any>;
const fromRow = (r: Row): ProductRequest => ({
  id: r.id, requestNumber: r.request_number, userId: r.user_id, fullName: r.full_name ?? "", phone: r.phone ?? "",
  productName: r.product_name, productUrl: r.product_url ?? null, image: r.image_path ?? null,
  storeName: r.store_name ?? "", storeCity: r.store_city ?? "", storePhone: r.store_phone ?? "",
  estimatedPrice: r.estimated_price == null ? null : Number(r.estimated_price), quantity: r.quantity ?? 1, months: r.months ?? null,
  notes: r.notes ?? "", status: r.status, adminNote: r.admin_note ?? "", quotedPrice: r.quoted_price == null ? null : Number(r.quoted_price),
  createdAt: r.created_at, updatedAt: r.updated_at,
});

// ---------- demo storage ----------
function demoRead(): ProductRequest[] {
  try { return JSON.parse(localStorage.getItem(DEMO_KEY) || "[]"); } catch { return []; }
}
function demoWrite(list: ProductRequest[]) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(list));
}

/** Shrinks a photo to at most 1000px JPEG so it fits in localStorage (demo) or uploads fast (real). */
export async function compressImage(file: File, maxSide = 1400, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("image"))), "image/jpeg", quality));
}
const blobToDataUrl = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = () => rej(r.error); r.readAsDataURL(b);
});

// ---------- API ----------
export async function submitRequest(who: Requester, i: NewRequestInput): Promise<{ error: string | null; requestNumber?: string }> {
  const bad = validateRequest(i);
  if (bad) return { error: bad };
  const price = i.estimatedPrice.trim() ? Number(i.estimatedPrice) : null;
  let blob: Blob | null = null;
  if (i.image) {
    try { blob = await compressImage(i.image, requestsAreDemo ? 900 : 1400); }
    catch { return { error: "تعذر قراءة الصورة. جرّب صورة أخرى" }; }
  }

  if (requestsAreDemo) {
    const now = new Date().toISOString();
    const num = "REQ-" + Math.random().toString(16).slice(2, 10).toUpperCase();
    const item: ProductRequest = {
      id: crypto.randomUUID(), requestNumber: num, userId: who.id, fullName: who.fullName, phone: who.phone,
      productName: i.productName.trim(), productUrl: i.productUrl.trim() || null, image: blob ? await blobToDataUrl(blob) : null,
      storeName: i.storeName.trim(), storeCity: i.storeCity.trim(), storePhone: i.storePhone.trim(),
      estimatedPrice: price, quantity: i.quantity, months: i.months, notes: i.notes.trim(),
      status: "new", adminNote: "", quotedPrice: null, createdAt: now, updatedAt: now,
    };
    try { demoWrite([item, ...demoRead()]); } catch { return { error: "مساحة التخزين في المتصفح ممتلئة. استخدم صورة أصغر أو بدون صورة" }; }
    return { error: null, requestNumber: num };
  }

  let imagePath: string | null = null;
  if (blob) {
    imagePath = `${who.id}/${crypto.randomUUID()}.jpg`;
    const up = await supabase.storage.from("request-images").upload(imagePath, blob, { contentType: "image/jpeg" });
    if (up.error) return { error: "تعذر رفع الصورة: " + up.error.message };
  }
  const { data, error } = await supabase.from("product_requests").insert({
    user_id: who.id, full_name: who.fullName || null, phone: who.phone || null,
    product_name: i.productName.trim(), product_url: i.productUrl.trim() || null, image_path: imagePath,
    store_name: i.storeName.trim() || null, store_city: i.storeCity.trim() || null, store_phone: i.storePhone.trim() || null,
    estimated_price: price, quantity: i.quantity, months: i.months, notes: i.notes.trim() || null,
  }).select("request_number").single();
  if (error) {
    if (imagePath) await supabase.storage.from("request-images").remove([imagePath]);
    return { error: /product_requests/.test(error.message) && /does not exist|schema cache/.test(error.message)
      ? "الميزة لم تُفعَّل في قاعدة البيانات بعد. نفّذ ملف 0017 في Supabase" : "تعذر إرسال الطلب: " + error.message };
  }
  return { error: null, requestNumber: data.request_number };
}

export async function listMyRequests(userId: string): Promise<{ data: ProductRequest[]; error: string | null }> {
  if (requestsAreDemo) return { data: demoRead().filter((r) => r.userId === userId), error: null };
  const { data, error } = await supabase.from("product_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  return { data: (data ?? []).map(fromRow), error: error?.message ?? null };
}

export async function listAllRequests(): Promise<{ data: ProductRequest[]; error: string | null }> {
  if (requestsAreDemo) return { data: demoRead(), error: null };
  const { data, error } = await supabase.from("product_requests").select("*").order("created_at", { ascending: false }).limit(500);
  return { data: (data ?? []).map(fromRow), error: error?.message ?? null };
}

export async function cancelMyRequest(id: string): Promise<string | null> {
  if (requestsAreDemo) {
    demoWrite(demoRead().map((r) => (r.id === id && OPEN_STATUSES.includes(r.status) ? { ...r, status: "cancelled", updatedAt: new Date().toISOString() } : r)));
    return null;
  }
  const { error } = await supabase.rpc("cancel_product_request", { p_id: id });
  return error ? "تعذر إلغاء الطلب" : null;
}

export async function staffUpdateRequest(id: string, patch: { status?: RequestStatus; adminNote?: string; quotedPrice?: number | null; storeName?: string; storePhone?: string }): Promise<string | null> {
  if (requestsAreDemo) {
    demoWrite(demoRead().map((r) => (r.id === id ? {
      ...r, ...(patch.status ? { status: patch.status } : {}), ...(patch.adminNote !== undefined ? { adminNote: patch.adminNote } : {}),
      ...(patch.quotedPrice !== undefined ? { quotedPrice: patch.quotedPrice } : {}),
      ...(patch.storeName !== undefined ? { storeName: patch.storeName } : {}), ...(patch.storePhone !== undefined ? { storePhone: patch.storePhone } : {}),
      updatedAt: new Date().toISOString() } : r)));
    return null;
  }
  const row: Row = {};
  if (patch.status) row.status = patch.status;
  if (patch.adminNote !== undefined) row.admin_note = patch.adminNote || null;
  if (patch.quotedPrice !== undefined) row.quoted_price = patch.quotedPrice;
  if (patch.storeName !== undefined) row.store_name = patch.storeName || null;
  if (patch.storePhone !== undefined) row.store_phone = patch.storePhone || null;
  const { error } = await supabase.from("product_requests").update(row).eq("id", id);
  return error ? "تعذر حفظ التغيير: " + error.message : null;
}

/** A URL the browser can show for the request photo (signed link, valid 5 minutes, in real mode). */
export async function requestImageSrc(r: Pick<ProductRequest, "image">): Promise<string | null> {
  if (!r.image) return null;
  if (requestsAreDemo || r.image.startsWith("data:")) return r.image;
  const { data } = await supabase.storage.from("request-images").createSignedUrl(r.image, 300);
  return data?.signedUrl ?? null;
}

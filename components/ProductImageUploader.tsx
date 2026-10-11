"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 8;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export type ProductImage = { id: string; storage_path: string };

/** Merchant uploads image FILES from the phone/computer. No URL field exists on purpose. */
export function ProductImageUploader({
  merchantId, productId, images, onChange,
}: {
  merchantId: string; productId: string; images: ProductImage[]; onChange: (images: ProductImage[]) => void;
}) {
  const supabase = createClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const publicUrl = (path: string) => supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    if (images.length + files.length > MAX_IMAGES) return toast.error(`الحد الأقصى ${MAX_IMAGES} صور للمنتج`);
    setBusy(true);
    const added: ProductImage[] = [];
    for (const file of Array.from(files)) {
      const ext = EXT[file.type];
      if (!ext) { toast.error(`${file.name}: الصيغ المسموحة JPG وPNG وWebP فقط`); continue; }
      if (file.size > MAX_BYTES) { toast.error(`${file.name}: الحجم أكبر من 5 ميغابايت`); continue; }
      const path = `${merchantId}/${productId}/${crypto.randomUUID()}.${ext}`;   // name is generated, not user-controlled
      const up = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) { console.error("image upload failed", up.error); toast.error(`تعذّر رفع ${file.name}`); continue; }
      const row = await supabase.from("product_images")
        .insert({ product_id: productId, storage_path: path, sort_order: images.length + added.length })
        .select("id, storage_path").single();
      if (row.error || !row.data) {
        console.error("image row failed", row.error);
        await supabase.storage.from("product-images").remove([path]);          // don't leave orphan files
        toast.error(`تعذّر حفظ ${file.name}`); continue;
      }
      added.push(row.data as ProductImage);
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    if (added.length) { onChange([...images, ...added]); toast.success("تم رفع الصور"); }
  }

  async function remove(img: ProductImage) {
    setBusy(true);
    const del = await supabase.from("product_images").delete().eq("id", img.id);
    if (del.error) { console.error("image delete failed", del.error); setBusy(false); return toast.error("تعذّر حذف الصورة"); }
    await supabase.storage.from("product-images").remove([img.storage_path]);
    setBusy(false);
    onChange(images.filter((i) => i.id !== img.id));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((img) => (
          <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg border border-neutral-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={publicUrl(img.storage_path)} alt="" className="h-full w-full object-cover" />
            <button type="button" onClick={() => remove(img)} disabled={busy} aria-label="حذف الصورة"
              className="absolute start-1 top-1 rounded-full bg-white/90 p-1 text-error disabled:opacity-50">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
        onChange={(e) => upload(e.target.files)} />
      <button type="button" onClick={() => input.current?.click()} disabled={busy || images.length >= MAX_IMAGES}
        className="flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-primary disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {busy ? "جارٍ الرفع..." : "رفع صور من الجهاز"}
      </button>
      <p className="text-xs text-neutral-500">JPG أو PNG أو WebP، حتى 5 ميغابايت للصورة، وبحد أقصى {MAX_IMAGES} صور.</p>
    </div>
  );
}

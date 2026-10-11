"use client";

import { useRef } from "react";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_MAX_COUNT = 8;
export const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Checks type, extension and size. Returns an Arabic error, or null when the file is allowed. */
export function validateProductImage(file: File): string | null {
  if (!(PRODUCT_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "نوع الملف غير مسموح. الصيغ المقبولة: JPG، PNG، WebP";
  }
  if (!/\.(jpe?g|png|webp)$/i.test(file.name)) {
    return "امتداد الملف غير مطابق لنوع الصورة";
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return "حجم الصورة يتجاوز 5 ميجابايت";
  }
  return null;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Merchant picks product photos from the phone gallery or computer files.
 * There is no URL field on purpose. The first image is the main one.
 * Note: images are kept in the app state as data URLs. Server upload to Supabase Storage
 * (see components/ProductImageUploader.tsx) is a separate step once the product is saved in the database.
 */
export function ImageFilePicker({
  images, onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = PRODUCT_IMAGE_MAX_COUNT - images.length;
    if (room <= 0) return toast.error(`الحد الأقصى ${PRODUCT_IMAGE_MAX_COUNT} صور للمنتج`);
    const added: string[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      const error = validateProductImage(file);
      if (error) { toast.error(`${file.name}: ${error}`); continue; }
      try {
        added.push(await readAsDataUrl(file));
      } catch {
        toast.error(`تعذّر قراءة ${file.name}`);
      }
    }
    if (added.length) {
      onChange([...images, ...added]);
      toast.success(`تمت إضافة ${added.length} صورة`);
    }
    if (input.current) input.current.value = "";
  }

  const remove = (index: number) => onChange(images.filter((_, i) => i !== index));
  const makeMain = (index: number) => {
    const next = [...images];
    const [picked] = next.splice(index, 1);
    onChange([picked, ...next]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={images.length >= PRODUCT_IMAGE_MAX_COUNT}
          className="flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-primary disabled:opacity-50"
        >
          <ImagePlus className="h-4 w-4" /> اختر صوراً من الجهاز
        </button>
        <span className="text-xs text-muted-foreground">JPG أو PNG أو WebP، حتى 5 ميجابايت للصورة، حتى {PRODUCT_IMAGE_MAX_COUNT} صور</span>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {images.length === 0 && (
        <p className="text-sm text-red-600">أضف صورة واحدة على الأقل للمنتج</p>
      )}

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((src, i) => (
            <li key={i} className="relative overflow-hidden rounded-lg border bg-white">
              <img src={src} alt="" className="aspect-square w-full object-cover" />
              {i === 0 ? (
                <span className="absolute right-1 top-1 rounded bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">الرئيسية</span>
              ) : (
                <button type="button" onClick={() => makeMain(i)} className="absolute right-1 top-1 rounded bg-white/90 p-1" aria-label="تعيين صورة رئيسية">
                  <Star className="h-3.5 w-3.5" />
                </button>
              )}
              <button type="button" onClick={() => remove(i)} className="absolute left-1 top-1 rounded bg-white/90 p-1 text-red-600" aria-label="حذف الصورة">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

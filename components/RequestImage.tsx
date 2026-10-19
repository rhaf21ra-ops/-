"use client";

import { useEffect, useState } from "react";
import { requestImageSrc, type ProductRequest } from "@/lib/product-requests";

export function RequestImage({ request, className }: { request: Pick<ProductRequest, "image" | "productName">; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    requestImageSrc(request).then((s) => { if (alive) setSrc(s); });
    return () => { alive = false; };
  }, [request.image]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!request.image) return null;
  if (!src) return <div className={`animate-pulse rounded-lg bg-muted ${className ?? "h-24 w-24"}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <a href={src} target="_blank" rel="noreferrer"><img src={src} alt={request.productName} className={`rounded-lg border object-cover ${className ?? "h-24 w-24"}`} /></a>;
}

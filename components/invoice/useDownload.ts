"use client";

import { useCallback, useRef, useState } from "react";
import { elementToPdf, safeFileName } from "@/lib/pdf";

/** Waits (max ~2.5 s) until the QR image inside the element has been drawn, so it is not missing from the PDF. */
async function waitForImages(el: HTMLElement) {
  for (let i = 0; i < 25; i++) {
    const imgs = Array.from(el.querySelectorAll("img"));
    if (imgs.length > 0 && imgs.every((m) => m.complete && m.naturalWidth > 0)) return;
    if (i > 8 && imgs.length === 0) return; // this document has no image
    await new Promise((r) => setTimeout(r, 100));
  }
}

export function usePdfDownload() {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const download = useCallback(async (filename: string) => {
    const el = ref.current;
    if (!el) return false;
    setBusy(true);
    try {
      await waitForImages(el);
      await elementToPdf(el, safeFileName(filename) + ".pdf");
      return true;
    } catch (e) {
      console.warn("pdf failed", e);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  return { ref, busy, download };
}

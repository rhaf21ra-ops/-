// Turns a rendered (Arabic, right-to-left) element into an A4 PDF in the browser.
// The browser draws the text (so Arabic shaping and fonts are exact), then the picture is cut into A4 pages.
export async function elementToPdf(el: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  if (typeof document !== "undefined" && (document as any).fonts?.ready) await (document as any).fonts.ready;
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgH = (canvas.height * pageW) / canvas.width;
  const img = canvas.toDataURL("image/jpeg", 0.92);
  let offset = 0;
  let left = imgH;
  pdf.addImage(img, "JPEG", 0, 0, pageW, imgH);
  left -= pageH;
  while (left > 0.5) {
    offset -= pageH;
    pdf.addPage();
    pdf.addImage(img, "JPEG", 0, offset, pageW, imgH);
    left -= pageH;
  }
  pdf.save(filename);
}

export function safeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "_");
}

"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

export function PWAInstaller() {
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Register SW
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(()=>{});
    }
    const handler = (e: any) => { e.preventDefault(); setDeferred(e); setShow(true); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show || !deferred) return null;
  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:w-96 bg-card border shadow-xl rounded-xl p-4 flex items-center gap-3 z-50 animate-in slide-in-from-bottom">
      <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0">س</div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">ثبت تطبيق قسطها</p>
        <p className="text-xs text-muted-foreground">تجربة أسرع مثل تطبيق حقيقي</p>
      </div>
      <Button size="sm" onClick={async()=>{ deferred.prompt(); const r=await deferred.userChoice; if(r.outcome==='accepted') setShow(false); }}><Download className="h-4 w-4 ml-1"/>تثبيت</Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={()=>setShow(false)}><X className="h-4 w-4"/></Button>
    </div>
  );
}

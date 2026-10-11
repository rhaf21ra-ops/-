"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Camera, Check, CreditCard, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/**
 * Identity capture. There is deliberately NO <input type="file"> anywhere in this component:
 * every photo comes from the live camera (getUserMedia). National ID = 3 screens, passport = 2 screens.
 * Note: this is a UI rule. A server cannot prove a photo came from a camera, so the reviewer still decides.
 */
type DocType = "national_id" | "passport";
type Shot = { key: string; title: string; hint: string; facing: "environment" | "user" };

const FLOWS: Record<DocType, Shot[]> = {
  national_id: [
    { key: "front", title: "الوجه الأمامي للبطاقة", hint: "ضع البطاقة داخل الإطار وتأكد أن البيانات واضحة بلا انعكاس ضوء", facing: "environment" },
    { key: "back", title: "الوجه الخلفي للبطاقة", hint: "اقلب البطاقة وصوّر ظهرها داخل الإطار", facing: "environment" },
    { key: "selfie_with_id", title: "سيلفي مع البطاقة", hint: "أمسك البطاقة بجانب وجهك بحيث يظهر وجهك والبطاقة معاً", facing: "user" },
  ],
  passport: [
    { key: "passport_photo", title: "صفحة بيانات الجواز", hint: "صوّر الصفحة التي فيها صورتك وبياناتك كاملة داخل الإطار", facing: "environment" },
    { key: "selfie_with_passport", title: "سيلفي مع الجواز", hint: "أمسك الجواز مفتوحاً بجانب وجهك بحيث يظهران معاً", facing: "user" },
  ],
};

const MAX_SIDE = 1600; // keeps each JPEG well under the 5 MB bucket limit

function CameraView({ facing, onCapture }: { facing: "environment" | "user"; onCapture: (blob: Blob) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [state, setState] = useState<"starting" | "ready" | "error">("starting");
  const [error, setError] = useState("");

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  const start = useCallback(async () => {
    setState("starting");
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("الكاميرا غير متاحة في هذا المتصفح أو هذه الصفحة غير آمنة (يلزم HTTPS)");
      return setState("error");
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      stream.current = s;
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play();
      }
      setState("ready");
    } catch (e) {
      console.error("camera start failed", e);
      const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
      setError(denied ? "لم تسمح للموقع باستخدام الكاميرا. فعّل الإذن من إعدادات المتصفح ثم أعد المحاولة"
                      : "تعذّر تشغيل الكاميرا. تأكد أنها غير مستخدمة في تطبيق آخر");
      setState("error");
    }
  }, [facing]);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  function snap() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, MAX_SIDE / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(v, 0, 0, canvas.width, canvas.height); // not mirrored: text stays readable
    canvas.toBlob((blob) => {
      if (!blob) return toast.error("تعذّر التقاط الصورة، حاول مرة أخرى");
      stop();
      onCapture(blob);
    }, "image/jpeg", 0.85);
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-neutral-900">
        <video ref={video} playsInline muted className="h-full w-full object-cover"
          style={facing === "user" ? { transform: "scaleX(-1)" } : undefined} />
        {state === "ready" && (
          <div className={`pointer-events-none absolute inset-6 border-2 border-white/80 ${
            facing === "user" ? "rounded-full" : "rounded-xl"}`} />
        )}
        {state === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center text-white"><Loader2 className="h-8 w-8 animate-spin" /></div>
        )}
        {state === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
            <p>{error}</p>
            <button type="button" onClick={start} className="rounded-lg bg-white px-4 py-2 text-neutral-900">إعادة المحاولة</button>
          </div>
        )}
      </div>
      <button type="button" onClick={snap} disabled={state !== "ready"}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-bold text-white disabled:opacity-50">
        <Camera className="h-5 w-5" /> التقاط الصورة
      </button>
    </div>
  );
}

export function IdentityCapture({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [doc, setDoc] = useState<DocType | null>(null);
  const [step, setStep] = useState(0);                       // index into the flow; == flow.length means "review"
  const [photos, setPhotos] = useState<Record<string, { blob: Blob; url: string; at: string }>>({});
  const [pending, setPending] = useState<Blob | null>(null); // just captured, awaiting confirm
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  const flow = doc ? FLOWS[doc] : [];
  const pendingUrl = useRef<string | null>(null);

  useEffect(() => () => {
    Object.values(photos).forEach((p) => URL.revokeObjectURL(p.url));
    if (pendingUrl.current) URL.revokeObjectURL(pendingUrl.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function onCapture(blob: Blob) {
    if (pendingUrl.current) URL.revokeObjectURL(pendingUrl.current);
    pendingUrl.current = URL.createObjectURL(blob);
    setPending(blob);
  }

  function confirm() {
    if (!pending || !pendingUrl.current) return;
    const key = flow[step].key;
    setPhotos((p) => ({ ...p, [key]: { blob: pending, url: pendingUrl.current!, at: new Date().toISOString() } }));
    pendingUrl.current = null;
    setPending(null);
    setStep((s) => s + 1);
  }

  function retake(index: number) {
    const key = flow[index].key;
    if (photos[key]) URL.revokeObjectURL(photos[key].url);
    setPhotos((p) => { const n = { ...p }; delete n[key]; return n; });
    setStep(index);
  }

  async function submit() {
    if (!doc || !consent) return;
    setBusy(true);
    const supabase = createClient();
    const batch = crypto.randomUUID();                       // new folder per attempt; owners cannot overwrite/delete files
    const files: Record<string, string> = {};
    const capturedAt: Record<string, string> = {};
    try {
      for (const shot of flow) {
        const path = `${userId}/${batch}/${shot.key}.jpg`;
        const up = await supabase.storage.from("identity-docs")
          .upload(path, photos[shot.key].blob, { contentType: "image/jpeg", upsert: false });
        if (up.error) throw up.error;
        files[shot.key] = path;
        capturedAt[shot.key] = photos[shot.key].at;
      }
      const { error } = await supabase.rpc("submit_identity", {
        doc, files, consent: true,
        meta: { method: "camera", captured_at: capturedAt, user_agent: navigator.userAgent.slice(0, 200) },
      });
      if (error) throw error;
      toast.success("تم إرسال هويتك للمراجعة. سنُعلمك عند التفعيل");
      onDone();
    } catch (e) {
      console.error("identity submit failed", e);
      toast.error("تعذّر إرسال الهوية. تحقق من اتصالك وحاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  }

  // ── Screen 0: choose document type
  if (!doc) {
    return (
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-primary" /> التحقق من الهوية</h2>
        <p className="text-sm text-neutral-500">اختر الوثيقة التي ستستخدمها. سنطلب منك تصويرها بالكاميرا مباشرة.</p>
        {([
          ["national_id", "بطاقة شخصية", "3 صور: الوجه الأمامي، الخلفي، وسيلفي مع البطاقة", CreditCard],
          ["passport", "جواز سفر", "صورتان: صفحة بيانات الجواز، وسيلفي مع الجواز", BookOpen],
        ] as const).map(([value, title, text, Icon]) => (
          <button key={value} type="button" onClick={() => { setDoc(value); setStep(0); }}
            className="flex w-full items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 text-start">
            <Icon className="h-8 w-8 text-primary" />
            <span><span className="block font-bold">{title}</span><span className="block text-sm text-neutral-500">{text}</span></span>
          </button>
        ))}
      </div>
    );
  }

  // ── Final screen: review + consent + submit
  if (step >= flow.length) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">مراجعة الصور</h2>
        <div className="grid grid-cols-3 gap-2">
          {flow.map((s, i) => (
            <div key={s.key} className="space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photos[s.key].url} alt={s.title} className="aspect-[4/3] w-full rounded-lg object-cover" />
              <p className="text-xs text-neutral-500">{s.title}</p>
              <button type="button" onClick={() => retake(i)} disabled={busy} className="text-xs text-primary">إعادة التصوير</button>
            </div>
          ))}
        </div>
        <label className="flex items-start gap-3 rounded-xl bg-neutral-100 p-4 text-sm">
          <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>أوافق على معالجة صور هويتي وبياناتي للتحقق من حسابي فقط، وأن يطّلع عليها موظفو المراجعة المخوَّلون.</span>
        </label>
        <button type="button" onClick={submit} disabled={!consent || busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-bold text-white disabled:opacity-50">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
          {busy ? "جارٍ الإرسال..." : "إرسال للمراجعة"}
        </button>
      </div>
    );
  }

  // ── Capture screens (one per photo)
  const shot = flow[step];
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">الخطوة {step + 1} من {flow.length}</p>
      <h2 className="text-lg font-bold">{shot.title}</h2>
      <p className="text-sm text-neutral-700">{shot.hint}</p>
      {pending ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pendingUrl.current!} alt="معاينة" className="aspect-[4/3] w-full rounded-xl object-cover" />
          <div className="flex gap-3">
            <button type="button" onClick={() => { setPending(null); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-300 px-4 py-3">
              <RefreshCw className="h-4 w-4" /> إعادة
            </button>
            <button type="button" onClick={confirm}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-bold text-white">
              <Check className="h-4 w-4" /> الصورة واضحة
            </button>
          </div>
        </div>
      ) : (
        <CameraView key={`${doc}-${step}`} facing={shot.facing} onCapture={onCapture} />
      )}
    </div>
  );
}

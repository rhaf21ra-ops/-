# دليل الحصول على دومين مجاني: Qastaha

## رابطك النهائي المقترح
- **الأساسي (Netlify):** `https://qastaha.netlify.app`  (إذا كان محجوزاً سيصبح `https://qastaha-alwan.netlify.app`)
- **البديل المميز:** `https://qastaha.is-a.dev` (دومين مجاني يشبه الحقيقي تماماً)

## الطريقة 1: Netlify (دقيقة واحدة - أنصحك بها)

### الخطوة 1: ارفع للـ GitHub
مستودعك الحالي: `github.com/rhaf21ra-ops/-` يحتاج تحديث. نفذ في الطرفية داخل مجلد المشروع:
```bash
git add .
git commit -m "PWA + Premium dashboard + Qastaha domain ready"
git push origin main
```
> إذا كان الرفع يفشل بسبب 100 ملف، استخدم GitHub Desktop

### الخطوة 2: اربط Netlify
1. افتح https://app.netlify.com/signup (سجل بحساب GitHub نفسه)
2. Add new site → Import an existing project → GitHub → اختر `rhaf21ra-ops/-`
3. Build settings تُقرأ تلقائياً من `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `.next`
4. قبل Deploy: اذهب إلى Site configuration → Environment variables → أضف الثلاثة:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://uluzsvemplutlphbokiq.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_jL8Eaeo1pip8rbZh1xBgiA_OWRBYXx5
   SUPABASE_SERVICE_ROLE_KEY=***SERVICE_ROLE***
   ```
5. Trigger deploy → بعد دقيقتين سيعطيك رابط `https://xxxxxxxx.netlify.app`

### الخطوة 3: غيّر الاسم إلى Qastaha
- في Netlify: Site configuration → Change site name → اكتب `qastaha` → Save
- إذا قال "Name already taken" جرب: `qastaha-alwan` أو `qastaha-ye`
- رابطك النهائي سيصبح: `https://qastaha.netlify.app`

## الطريقة 2: دومين is-a.dev المجاني (اختياري - يبدو احترافي أكثر)
1. افتح https://github.com/is-a-dev/register
2. Fork المستودع
3. أنشئ ملف `domains/qastaha.json` بمحتوى:
```json
{
  "owner": { "username": "rhaf21ra-ops", "email": "alwan7988@gmail.com" },
  "records": { "CNAME": "qastaha.netlify.app" }
}
```
4. Pull Request → خلال ساعات يوافقوا → يصبح رابطك `https://qastaha.is-a.dev`

## بعد النشر: تأكد
افتح `https://qastaha.netlify.app/status` → يجب أن يكون أخضر
افتح `https://qastaha.netlify.app/admin` → سجل دخولك كمالك


# قسطها

## التشغيل المحلي
```bash
npm install
cp .env.example .env.local      # عبّئ مفاتيح Supabase
npm run test                    # اختبارات الوحدة (التقسيط والعمولة)
npx tsc --noEmit                # فحص الأنواع
npm run dev
```

## قاعدة البيانات
الهجرات بالترتيب في `supabase/migrations` (0001 إلى 0008). على مشروع Supabase:
```bash
supabase link --project-ref <ref>
supabase db push
supabase functions deploy identity-file-url
```
اختبار RLS محلياً على Postgres عادي: انظر `supabase/tests/README.md`. وأعد تشغيله على نسخة Supabase حقيقية.

## ملاحظات
- أول مالك (admin): تُدخله يدوياً من محرر SQL، ولا يمكن التسجيل كمالك من الموقع.
- قائمة فروع الكريمي: `supabase/seed/import_branches.sql` (تحتاج القائمة الرسمية).
- الكود غير مُشغَّل بعد: كتبته في بيئة بلا npm، فتوقّع أخطاء أنواع صغيرة عند أول بناء.

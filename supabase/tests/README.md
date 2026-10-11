# اختبار قاعدة البيانات محلياً (بدون Supabase)

يحاكي `local_supabase_stub.sql` مخطط `auth` ودوال `auth.uid()` و`auth.role()` فقط. هذا **ليس** Supabase الحقيقي،
فأعد تشغيل `rls_test.sql` على مشروعك الفعلي (فرع/نسخة تطوير) قبل الاعتماد على النتائج.

```bash
createdb soq_test
psql -d soq_test -f supabase/tests/local_supabase_stub.sql
for f in supabase/migrations/*.sql; do psql -v ON_ERROR_STOP=1 -d soq_test -f "$f"; done
psql -d soq_test -f supabase/tests/rls_test.sql | grep -E "PASS|FAIL"
```

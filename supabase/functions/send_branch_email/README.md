# نشر Edge Function
1. ثبت Supabase CLI: npm install -g supabase
2. سجل: supabase login
3. اربط: supabase link --project-ref uluzsvemplutlphbokiq
4. انشر: supabase functions deploy send_branch_email --no-verify-jwt
5. اضبط SMTP (اختياري للإرسال الحقيقي):
   supabase secrets set SMTP_HOST=smtp.gmail.com SMTP_USER=you@gmail.com SMTP_PASS=app_password SMTP_FROM=noreply@qistuhu.com

# دليل بناء APK - قسطها (com.qistuha.app)

> كل شيء جاهز للنشر - اتبع الخطوات على جهازك (Windows/Mac) مع Android Studio

## 1) المتطلبات
- Node 20 + npm
- Android Studio + Android SDK 34
- Java 17
- Keystore للتوقيع (للنشر على Google Play)

## 2) إعداد Capacitor (مرة واحدة)

```bash
cd qastaha
npm install @capacitor/core @capacitor/cli @capacitor/android --save
npx cap init "قسطها" com.qistuha.app --web-dir=out
```

`capacitor.config.ts` موجود بالفعل:
```ts
appId: 'com.qistuha.app'
appName: 'قسطها'
webDir: 'out'
server.url: 'https://qistuha.netlify.app' // للاختبار الحي
```

## 3) بناء الويب للتصدير (Static Export)

`next.config.js` حالياً `images.unoptimized: true` - أضف للتصدير:

```js
// next.config.js
const nextConfig = {
  output: 'export', // <-- أضف هذا للـ APK
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
}
```

ثم:
```bash
npm run build
# سيُنشئ مجلد out/ (76 صفحة)
```

## 4) إضافة Android وإنشاء المشروع

```bash
npx cap add android
npx cap copy android
npx cap open android
```

في Android Studio:
- انتظر Gradle Sync
- افتح `android/app/src/main/AndroidManifest.xml` وتأكد من الصلاحيات:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.INTERNET" />
```

## 5) بناء APK للاختبار

في Android Studio: Build → Build APK(s) → debug
أو عبر CLI:

```bash
cd android
./gradlew assembleDebug
# الملف: android/app/build/outputs/apk/debug/app-debug.apk
```

ثبّته على جوال: `adb install app-debug.apk`

## 6) بناء AAB للنشر (Google Play)

1. أنشئ keystore:

```bash
keytool -genkey -v -keystore qistuha.keystore -alias qistuha -keyalg RSA -keysize 2048 -validity 10000
```

2. ضعه في `android/app/` وأضف في `android/gradle.properties`:

```
MYAPP_UPLOAD_STORE_FILE=qistuha.keystore
MYAPP_UPLOAD_KEY_ALIAS=qistuha
MYAPP_UPLOAD_STORE_PASSWORD=*****
MYAPP_UPLOAD_KEY_PASSWORD=*****
```

3. في `android/app/build.gradle` داخل `android { signingConfigs { release { ... }}}`

4. بناء:

```bash
cd android
./gradlew bundleRelease
# الملف: android/app/build/outputs/bundle/release/app-release.aab
```

## 7) ملاحظات Netlify vs Export

- **للاختبار السريع:** اترك `server.url: https://qistuha.netlify.app` في capacitor.config.ts - التطبيق سيفتح الموقع الحي مباشرة (لا يحتاج export).
- **للإطلاق النهائي المستقل:** احذف `server.url` واعتمد على `webDir: out` مع `output: export`.

## 8) اختبار قبل الرفع

- التسجيل (عميل/تاجر) → التحقق من الهوية (camera) → يجب أن يطلب إذن الكاميرا
- المتجر → السلة → الدفع → اختيار فرع → إرسال موقع GPS → يطلب إذن الموقع
- تأكد أن Deep Links تعمل: `qistuha://shop` (إن أضفت App Links)

## 9) الحالة الحالية

- Build محلي ناجح: 76 صفحة، middleware 210kB
- آخر دفع GitHub: bcc3407 (إصلاح تداخل الصفحات)
- الحاجة: `Trigger deploy` في Netlify ليأخذ bcc3407 قبل بناء APK الحي

---

**جاهز!** بعد `Trigger deploy` شغّل الخطوات 3-5 وسيخرج `app-debug.apk` خلال 5 دقائق.

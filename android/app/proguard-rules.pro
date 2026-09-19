# ── Capacitor & Cordova Core Rules ─────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
}
-keep class org.apache.cordova.** { *; }
-keep interface org.apache.cordova.** { *; }

# ── WebView JavaScript Interface Rules ──────────────────────────────────────
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── Application Native Classes ─────────────────────────────────────────────
-keep class cloud.patholab.app.** { *; }
-keep class androidx.security.crypto.** { *; }
-keep class com.google.crypto.tink.** { *; }
-keep class com.google.zxing.** { *; }

# ── Suppress Missing Annotations in Third-Party Libraries ──────────────────
-dontwarn javax.annotation.**
-dontwarn javax.annotation.Nullable
-dontwarn javax.annotation.concurrent.GuardedBy
-dontwarn com.google.crypto.tink.**
-dontwarn com.getcapacitor.**
-dontwarn org.apache.cordova.**

# ── Keep Line Numbers for Crashlytics / Stack Traces ────────────────────────
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*

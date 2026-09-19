package cloud.patholab.app;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.LruCache;
import android.widget.ImageView;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * High-performance, memory-safe image loader with LruCache and automatic
 * downsampling to prevent OutOfMemoryError and comply with Google Play
 * bitmap optimization recommendations.
 */
public class ImageLoaderHelper {

    private static ImageLoaderHelper instance;
    private final LruCache<String, Bitmap> memoryCache;
    private final ExecutorService executorService = Executors.newFixedThreadPool(4);
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private ImageLoaderHelper() {
        int maxMemory = (int) (Runtime.getRuntime().maxMemory() / 1024);
        int cacheSize = maxMemory / 8; // Use 1/8th of available memory for cache
        memoryCache = new LruCache<String, Bitmap>(cacheSize) {
            @Override
            protected int sizeOf(String key, Bitmap bitmap) {
                return bitmap.getByteCount() / 1024;
            }
        };
    }

    public static synchronized ImageLoaderHelper getInstance() {
        if (instance == null) {
            instance = new ImageLoaderHelper();
        }
        return instance;
    }

    public static void load(Context context, String urlOrData, ImageView imageView, int placeholderRes) {
        getInstance().loadImage(urlOrData, imageView, placeholderRes, null);
    }

    public static void load(Context context, String urlOrData, ImageView imageView, int placeholderRes, ImageCallback callback) {
        getInstance().loadImage(urlOrData, imageView, placeholderRes, callback);
    }

    public interface ImageCallback {
        void onLoaded(Bitmap bitmap);
        void onError();
    }

    public void loadImage(String urlOrData, ImageView imageView, int placeholderRes, ImageCallback callback) {
        if (imageView == null) return;

        if (urlOrData == null || urlOrData.trim().isEmpty()) {
            if (placeholderRes != 0) imageView.setImageResource(placeholderRes);
            if (callback != null) callback.onError();
            return;
        }

        final String source = urlOrData.trim();

        // 1. Check memory cache first
        Bitmap cached = memoryCache.get(source);
        if (cached != null && !cached.isRecycled()) {
            imageView.setImageBitmap(cached);
            if (callback != null) callback.onLoaded(cached);
            return;
        }

        if (placeholderRes != 0) {
            imageView.setImageResource(placeholderRes);
        }

        // Set tag to handle view recycling
        imageView.setTag(source);

        // 2. Load asynchronously with downsampling
        executorService.execute(() -> {
            Bitmap bitmap = null;
            try {
                if (source.startsWith("data:image")) {
                    int commaIdx = source.indexOf(",");
                    if (commaIdx != -1) {
                        byte[] bytes = Base64.decode(source.substring(commaIdx + 1), Base64.DEFAULT);
                        bitmap = decodeSampledBitmap(bytes, 400, 400);
                    }
                } else if (source.startsWith("http://") || source.startsWith("https://")) {
                    URL url = new URL(source);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(8000);
                    conn.setInstanceFollowRedirects(true);
                    conn.connect();

                    if (conn.getResponseCode() == HttpURLConnection.HTTP_OK) {
                        try (InputStream is = conn.getInputStream();
                             ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
                            byte[] chunk = new byte[8192];
                            int read;
                            while ((read = is.read(chunk, 0, chunk.length)) != -1) {
                                buffer.write(chunk, 0, read);
                            }
                            byte[] bytes = buffer.toByteArray();
                            bitmap = decodeSampledBitmap(bytes, 600, 600);
                        }
                    }
                    conn.disconnect();
                }

                if (bitmap != null) {
                    memoryCache.put(source, bitmap);
                    final Bitmap finalBmp = bitmap;
                    mainHandler.post(() -> {
                        if (source.equals(imageView.getTag())) {
                            imageView.setImageBitmap(finalBmp);
                        }
                        if (callback != null) callback.onLoaded(finalBmp);
                    });
                } else {
                    mainHandler.post(() -> {
                        if (callback != null) callback.onError();
                    });
                }
            } catch (Exception e) {
                mainHandler.post(() -> {
                    if (callback != null) callback.onError();
                });
            }
        });
    }

    private static Bitmap decodeSampledBitmap(byte[] data, int reqWidth, int reqHeight) {
        if (data == null || data.length == 0) return null;

        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inJustDecodeBounds = true;
        BitmapFactory.decodeByteArray(data, 0, data.length, options);

        options.inSampleSize = calculateInSampleSize(options, reqWidth, reqHeight);
        options.inJustDecodeBounds = false;
        options.inPreferredConfig = Bitmap.Config.ARGB_8888;

        return BitmapFactory.decodeByteArray(data, 0, data.length, options);
    }

    private static int calculateInSampleSize(BitmapFactory.Options options, int reqWidth, int reqHeight) {
        final int height = options.outHeight;
        final int width = options.outWidth;
        int inSampleSize = 1;

        if (height > reqHeight || width > reqWidth) {
            final int halfHeight = height / 2;
            final int halfWidth = width / 2;

            while ((halfHeight / inSampleSize) >= reqHeight && (halfWidth / inSampleSize) >= reqWidth) {
                inSampleSize *= 2;
            }
        }
        return Math.max(1, inSampleSize);
    }
}

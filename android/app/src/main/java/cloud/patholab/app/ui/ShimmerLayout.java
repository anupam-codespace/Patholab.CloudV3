package cloud.patholab.app.ui;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Shader;
import android.util.AttributeSet;
import android.view.animation.LinearInterpolator;
import android.widget.FrameLayout;

/**
 * High-performance hardware-accelerated Shimmer container.
 * Sweeps a smooth linear gradient across all child skeleton cards, pills, and circles.
 */
public class ShimmerLayout extends FrameLayout {

    private Paint shimmerPaint;
    private ValueAnimator shimmerAnimator;
    private float shimmerProgress = 0f;
    private Matrix shaderMatrix;
    private LinearGradient linearGradient;
    private boolean isDarkMode = false;
    private boolean isAnimationStarted = false;

    public ShimmerLayout(Context context) {
        super(context);
        init();
    }

    public ShimmerLayout(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    public ShimmerLayout(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init();
    }

    private void init() {
        setWillNotDraw(false);
        setLayerType(LAYER_TYPE_HARDWARE, null);

        shimmerPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        shimmerPaint.setDither(true);
        shimmerPaint.setFilterBitmap(true);
        shimmerPaint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_ATOP));

        shaderMatrix = new Matrix();

        shimmerAnimator = ValueAnimator.ofFloat(-1.0f, 2.0f);
        shimmerAnimator.setDuration(1350);
        shimmerAnimator.setRepeatCount(ValueAnimator.INFINITE);
        shimmerAnimator.setRepeatMode(ValueAnimator.RESTART);
        shimmerAnimator.setInterpolator(new LinearInterpolator());
        shimmerAnimator.addUpdateListener(animation -> {
            shimmerProgress = (float) animation.getAnimatedValue();
            invalidate();
        });
    }

    public void setDarkMode(boolean darkMode) {
        if (this.isDarkMode != darkMode || linearGradient == null) {
            this.isDarkMode = darkMode;
            updateGradient();
            invalidate();
        }
    }

    private void updateGradient() {
        int w = getWidth() > 0 ? getWidth() : 1000;
        int shimmerWidth = (int) (w * 0.55f);

        int edgeColor = isDarkMode ? 0x001E293B : 0x00FFFFFF;
        int centerColor = isDarkMode ? 0x5564748B : 0x88FFFFFF;

        int[] colors = new int[] { edgeColor, centerColor, edgeColor };
        float[] positions = new float[] { 0.0f, 0.5f, 1.0f };

        linearGradient = new LinearGradient(
                0, 0,
                shimmerWidth, 0,
                colors,
                positions,
                Shader.TileMode.CLAMP
        );
        shimmerPaint.setShader(linearGradient);
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        super.onSizeChanged(w, h, oldw, oldh);
        updateGradient();
    }

    public void startShimmer() {
        if (!isAnimationStarted) {
            isAnimationStarted = true;
            if (shimmerAnimator != null && !shimmerAnimator.isStarted()) {
                shimmerAnimator.start();
            }
        }
    }

    public void stopShimmer() {
        if (isAnimationStarted) {
            isAnimationStarted = false;
            if (shimmerAnimator != null) {
                shimmerAnimator.cancel();
            }
            invalidate();
        }
    }

    @Override
    protected void dispatchDraw(Canvas canvas) {
        super.dispatchDraw(canvas);

        if (isAnimationStarted && linearGradient != null && getWidth() > 0) {
            int w = getWidth();
            int h = getHeight();

            float translateX = w * shimmerProgress;

            shaderMatrix.reset();
            shaderMatrix.postRotate(20, w / 2f, h / 2f);
            shaderMatrix.postTranslate(translateX, 0);
            linearGradient.setLocalMatrix(shaderMatrix);

            canvas.drawRect(0, 0, w, h, shimmerPaint);
        }
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        if (getVisibility() == VISIBLE) {
            startShimmer();
        }
    }

    @Override
    protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        stopShimmer();
    }

    @Override
    public void setVisibility(int visibility) {
        super.setVisibility(visibility);
        if (visibility == VISIBLE) {
            startShimmer();
        } else {
            stopShimmer();
        }
    }
}

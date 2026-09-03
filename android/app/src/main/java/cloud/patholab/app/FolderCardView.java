package cloud.patholab.app;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.widget.FrameLayout;

/**
 * FolderCardView
 * ──────────────
 * Custom tabbed / folder-shaped card container matching the exact reference geometry:
 * - Lower top horizontal border on the left with rounded corner
 * - Smooth continuous S-curve transition upward into the raised top-right tab
 * - Rounded top-right, bottom-right, and bottom-left corners
 * - Crisp solid dark outline border with white card fill
 */
public class FolderCardView extends FrameLayout {

    private final Paint fillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint strokePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Path cardPath = new Path();
    private final RectF arcRect = new RectF();

    private float cornerRadius;
    private float tabHeight;
    private float tabWidth;
    private float filletRadius;

    public FolderCardView(Context context) {
        super(context);
        init(context);
    }

    public FolderCardView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init(context);
    }

    public FolderCardView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init(context);
    }

    private void init(Context context) {
        setWillNotDraw(false);
        setLayerType(LAYER_TYPE_SOFTWARE, null);
        float density = context.getResources().getDisplayMetrics().density;
        cornerRadius = 22 * density;
        tabHeight = 40 * density;
        tabWidth = 106 * density;
        filletRadius = 16 * density;

        fillPaint.setColor(Color.WHITE);
        fillPaint.setStyle(Paint.Style.FILL);
        fillPaint.setShadowLayer(6 * density, 0, 2 * density, Color.argb(16, 15, 23, 42));

        strokePaint.setColor(Color.parseColor("#E2E8F0"));
        strokePaint.setStyle(Paint.Style.STROKE);
        strokePaint.setStrokeWidth(1.2f * density);
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        super.onSizeChanged(w, h, oldw, oldh);
        buildPath(w, h);
    }

    private void buildPath(float w, float h) {
        cardPath.reset();
        float r = cornerRadius;
        float th = tabHeight;
        float tw = tabWidth;
        float f = filletRadius;

        float sCurveStartX = Math.max(r, w - tw - 2 * f);

        // 1. Start on the left vertical edge below top-left corner
        cardPath.moveTo(0, th + r);

        // 2. Top-left corner: arc from 180 to 270 deg
        arcRect.set(0, th, 2 * r, th + 2 * r);
        cardPath.arcTo(arcRect, 180, 90, false);

        // 3. Top horizontal edge (left side under title)
        cardPath.lineTo(sCurveStartX, th);

        // 4. Smooth S-curve transition upward into the raised top-right tab
        // Concave curve turning up (from horizontal th to vertical)
        arcRect.set(sCurveStartX - f, th - 2 * f, sCurveStartX + f, th);
        cardPath.arcTo(arcRect, 90, -90, false);

        // Convex curve turning right (from vertical to horizontal y = 0)
        arcRect.set(sCurveStartX + f, 0, sCurveStartX + 3 * f, 2 * f);
        cardPath.arcTo(arcRect, 180, 90, false);

        // 5. Top horizontal edge of the tab
        cardPath.lineTo(w - r, 0);

        // 6. Top-right corner of tab
        arcRect.set(w - 2 * r, 0, w, 2 * r);
        cardPath.arcTo(arcRect, 270, 90, false);

        // 7. Right vertical edge
        cardPath.lineTo(w, h - r);

        // 8. Bottom-right corner
        arcRect.set(w - 2 * r, h - 2 * r, w, h);
        cardPath.arcTo(arcRect, 0, 90, false);

        // 9. Bottom horizontal edge
        cardPath.lineTo(r, h);

        // 10. Bottom-left corner
        arcRect.set(0, h - 2 * r, 2 * r, h);
        cardPath.arcTo(arcRect, 90, 90, false);

        // 11. Left vertical edge
        cardPath.lineTo(0, th + r);

        cardPath.close();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        if (!cardPath.isEmpty()) {
            canvas.drawPath(cardPath, fillPaint);
            canvas.drawPath(cardPath, strokePaint);
        }
        super.onDraw(canvas);
    }
}

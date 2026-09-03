package cloud.patholab.app.ui;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.DashPathEffect;
import android.graphics.Paint;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.view.View;

import androidx.annotation.Nullable;

import java.util.ArrayList;
import java.util.List;

/**
 * SimpleBarChartView — High-performance rounded bar chart for Android
 * Replicates web Recharts BarChart (Test Volume Trend) with zero external library overhead.
 */
public class SimpleBarChartView extends View {

    public static class BarItem {
        public final String label;
        public final int count;

        public BarItem(String label, int count) {
            this.label = label;
            this.count = count;
        }
    }

    private final List<BarItem> items = new ArrayList<>();
    private final Paint barPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint gridPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint valuePaint = new Paint(Paint.ANTI_ALIAS_FLAG);

    public SimpleBarChartView(Context context) {
        super(context);
        init();
    }

    public SimpleBarChartView(Context context, @Nullable AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    public SimpleBarChartView(Context context, @Nullable AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init();
    }

    private void init() {
        barPaint.setColor(Color.parseColor("#3B82F6")); // Blue-500
        barPaint.setStyle(Paint.Style.FILL);

        gridPaint.setColor(Color.parseColor("#E2E8F0"));
        gridPaint.setStyle(Paint.Style.STROKE);
        gridPaint.setStrokeWidth(dp(1f));
        gridPaint.setPathEffect(new DashPathEffect(new float[]{dp(4f), dp(4f)}, 0));

        textPaint.setColor(Color.parseColor("#94A3B8"));
        textPaint.setTextSize(sp(9.5f));
        textPaint.setTextAlign(Paint.Align.CENTER);

        valuePaint.setColor(Color.parseColor("#475569"));
        valuePaint.setTextSize(sp(9.5f));
        valuePaint.setTextAlign(Paint.Align.CENTER);
    }

    public void setData(List<BarItem> newItems) {
        this.items.clear();
        if (newItems != null) {
            this.items.addAll(newItems);
        }
        invalidate();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);

        int width = getWidth();
        int height = getHeight();

        float paddingLeft = dp(12f);
        float paddingRight = dp(12f);
        float paddingTop = dp(20f);
        float paddingBottom = dp(24f);

        float chartWidth = width - paddingLeft - paddingRight;
        float chartHeight = height - paddingTop - paddingBottom;

        if (chartWidth <= 0 || chartHeight <= 0) return;

        // Draw horizontal grid lines
        for (int i = 0; i <= 3; i++) {
            float y = paddingTop + (chartHeight / 3f) * i;
            canvas.drawLine(paddingLeft, y, width - paddingRight, y, gridPaint);
        }

        if (items.isEmpty()) {
            textPaint.setTextAlign(Paint.Align.CENTER);
            canvas.drawText("No test volume recorded", width / 2f, height / 2f, textPaint);
            return;
        }

        int maxVal = 1;
        for (BarItem bi : items) {
            if (bi.count > maxVal) maxVal = bi.count;
        }
        float effectiveMax = maxVal * 1.2f;

        int count = items.size();
        float availableSlotWidth = chartWidth / (float) count;
        float barWidth = Math.min(dp(28f), availableSlotWidth * 0.65f);
        float cornerRadius = dp(4f);

        int labelInterval = Math.max(1, count / 5);

        for (int i = 0; i < count; i++) {
            BarItem item = items.get(i);
            float slotCenter = paddingLeft + (i + 0.5f) * availableSlotWidth;
            float barLeft = slotCenter - (barWidth / 2f);
            float barRight = slotCenter + (barWidth / 2f);

            float ratio = Math.max(0f, Math.min(1f, item.count / effectiveMax));
            float barTop = paddingTop + chartHeight * (1f - ratio);
            float barBottom = paddingTop + chartHeight;

            // Draw Bar
            RectF rect = new RectF(barLeft, barTop, barRight, barBottom);
            canvas.drawRoundRect(rect, cornerRadius, cornerRadius, barPaint);

            // Draw Value Top label if value > 0 and count <= 12
            if (item.count > 0 && count <= 12) {
                canvas.drawText(String.valueOf(item.count), slotCenter, barTop - dp(4f), valuePaint);
            }

            // Draw X-axis date label
            if (i == 0 || i == count - 1 || i % labelInterval == 0) {
                canvas.drawText(item.label, slotCenter, height - dp(6f), textPaint);
            }
        }
    }

    private float dp(float val) {
        return val * getResources().getDisplayMetrics().density;
    }

    private float sp(float val) {
        return val * getResources().getDisplayMetrics().scaledDensity;
    }
}

package cloud.patholab.app.ui;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.DashPathEffect;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Shader;
import android.util.AttributeSet;
import android.view.View;

import androidx.annotation.Nullable;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * SimpleAreaChartView — High-performance smooth gradient area chart for Android
 * Replicates web Recharts AreaChart (Revenue Trend) with zero external library overhead.
 */
public class SimpleAreaChartView extends View {

    public static class DataPoint {
        public final String label;
        public final float value;

        public DataPoint(String label, float value) {
            this.label = label;
            this.value = value;
        }
    }

    private final List<DataPoint> points = new ArrayList<>();
    private final Paint linePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint fillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint gridPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint pointPaint = new Paint(Paint.ANTI_ALIAS_FLAG);

    private final Path linePath = new Path();
    private final Path fillPath = new Path();

    public SimpleAreaChartView(Context context) {
        super(context);
        init();
    }

    public SimpleAreaChartView(Context context, @Nullable AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    public SimpleAreaChartView(Context context, @Nullable AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init();
    }

    private void init() {
        linePaint.setColor(Color.parseColor("#10B981"));
        linePaint.setStyle(Paint.Style.STROKE);
        linePaint.setStrokeWidth(dp(2.5f));
        linePaint.setStrokeCap(Paint.Cap.ROUND);
        linePaint.setStrokeJoin(Paint.Join.ROUND);

        fillPaint.setStyle(Paint.Style.FILL);

        gridPaint.setColor(Color.parseColor("#E2E8F0"));
        gridPaint.setStyle(Paint.Style.STROKE);
        gridPaint.setStrokeWidth(dp(1f));
        gridPaint.setPathEffect(new DashPathEffect(new float[]{dp(4f), dp(4f)}, 0));

        textPaint.setColor(Color.parseColor("#94A3B8"));
        textPaint.setTextSize(sp(10f));
        textPaint.setTextAlign(Paint.Align.CENTER);

        pointPaint.setColor(Color.parseColor("#10B981"));
        pointPaint.setStyle(Paint.Style.FILL);
    }

    public void setData(List<DataPoint> newPoints) {
        this.points.clear();
        if (newPoints != null) {
            this.points.addAll(newPoints);
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
        float paddingTop = dp(16f);
        float paddingBottom = dp(24f);

        float chartWidth = width - paddingLeft - paddingRight;
        float chartHeight = height - paddingTop - paddingBottom;

        if (chartWidth <= 0 || chartHeight <= 0) return;

        // Draw horizontal grid lines
        for (int i = 0; i <= 3; i++) {
            float y = paddingTop + (chartHeight / 3f) * i;
            canvas.drawLine(paddingLeft, y, width - paddingRight, y, gridPaint);
        }

        if (points.isEmpty()) {
            textPaint.setTextAlign(Paint.Align.CENTER);
            canvas.drawText("No trend data available", width / 2f, height / 2f, textPaint);
            return;
        }

        float maxVal = 1f;
        for (DataPoint dp : points) {
            if (dp.value > maxVal) maxVal = dp.value;
        }
        // Add 10% headroom
        maxVal *= 1.15f;

        int count = points.size();
        float stepX = count > 1 ? (chartWidth / (count - 1)) : 0f;

        linePath.reset();
        fillPath.reset();

        float[] xCoords = new float[count];
        float[] yCoords = new float[count];

        for (int i = 0; i < count; i++) {
            xCoords[i] = paddingLeft + (count == 1 ? chartWidth / 2f : i * stepX);
            float ratio = Math.max(0f, Math.min(1f, points.get(i).value / maxVal));
            yCoords[i] = paddingTop + chartHeight * (1f - ratio);
        }

        // Build smooth curve path
        linePath.moveTo(xCoords[0], yCoords[0]);
        fillPath.moveTo(xCoords[0], yCoords[0]);

        for (int i = 0; i < count - 1; i++) {
            float x1 = xCoords[i];
            float y1 = yCoords[i];
            float x2 = xCoords[i + 1];
            float y2 = yCoords[i + 1];

            float controlX1 = x1 + (x2 - x1) / 2f;
            float controlY1 = y1;
            float controlX2 = x1 + (x2 - x1) / 2f;
            float controlY2 = y2;

            linePath.cubicTo(controlX1, controlY1, controlX2, controlY2, x2, y2);
            fillPath.cubicTo(controlX1, controlY1, controlX2, controlY2, x2, y2);
        }

        // Close fill path
        fillPath.lineTo(xCoords[count - 1], paddingTop + chartHeight);
        fillPath.lineTo(xCoords[0], paddingTop + chartHeight);
        fillPath.close();

        // Create shader for fill
        LinearGradient gradient = new LinearGradient(
                0, paddingTop, 0, paddingTop + chartHeight,
                Color.parseColor("#5010B981"), // 30% emerald
                Color.parseColor("#0010B981"), // 0% transparent
                Shader.TileMode.CLAMP
        );
        fillPaint.setShader(gradient);

        // Draw fill & line
        canvas.drawPath(fillPath, fillPaint);
        canvas.drawPath(linePath, linePaint);

        // Draw points & labels
        int labelInterval = Math.max(1, count / 5);
        for (int i = 0; i < count; i++) {
            // Draw dot if high point or selected interval
            if (i == 0 || i == count - 1 || i % labelInterval == 0) {
                canvas.drawCircle(xCoords[i], yCoords[i], dp(3.5f), pointPaint);

                // Draw X-axis date label
                String label = points.get(i).label;
                canvas.drawText(label, xCoords[i], height - dp(6f), textPaint);
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

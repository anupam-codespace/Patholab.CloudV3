package cloud.patholab.app;

import android.app.Dialog;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.PopupWindow;
import android.widget.Toast;

public class SupportAssistanceHelper {

    public static final String SUPPORT_PHONE = "+918402010207";
    public static final String SUPPORT_PHONE_DISPLAY = "+91 8402010207";
    public static final String SUPPORT_EMAIL = "support@patholab.cloud";
    public static final String SUPPORT_DASHBOARD_URL = "https://patholab.cloud/support";

    private static PopupWindow currentPopup = null;

    /**
     * Shows a sleek floating card popup anchored directly beneath the Help button,
     * matching the profile popup card UI aesthetic.
     */
    public static void showSupportPopup(Context context, View anchor) {
        if (context == null) return;
        if (anchor == null) {
            showSupportDialog(context);
            return;
        }

        try {
            if (currentPopup != null && currentPopup.isShowing()) {
                currentPopup.dismiss();
                currentPopup = null;
                return;
            }

            View popupView = LayoutInflater.from(context).inflate(R.layout.layout_help_popup, null);
            int popupWidth = dp(context, 285);

            PopupWindow popup = new PopupWindow(
                    popupView,
                    popupWidth,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    true
            );
            popup.setElevation(dp(context, 14));
            popup.setOutsideTouchable(true);
            popup.setFocusable(true);
            popup.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));

            // Option 1: Priority Call
            View btnCall = popupView.findViewById(R.id.helpBtnCall);
            if (btnCall != null) {
                btnCall.setOnClickListener(v -> {
                    popup.dismiss();
                    makePhoneCall(context);
                });
            }

            // Option 2: WhatsApp Chat
            View btnWhatsApp = popupView.findViewById(R.id.helpBtnWhatsApp);
            if (btnWhatsApp != null) {
                btnWhatsApp.setOnClickListener(v -> {
                    popup.dismiss();
                    openWhatsApp(context, "Hello Patholab Cloud Support, I need assistance with my laboratory.");
                });
            }

            // Option 3: Email Support
            View btnEmail = popupView.findViewById(R.id.helpBtnEmail);
            if (btnEmail != null) {
                btnEmail.setOnClickListener(v -> {
                    popup.dismiss();
                    sendEmail(context);
                });
            }

            // Option 4: Support Portal
            View btnDashboard = popupView.findViewById(R.id.helpBtnDashboard);
            if (btnDashboard != null) {
                btnDashboard.setOnClickListener(v -> {
                    popup.dismiss();
                    openDashboard(context);
                });
            }

            // Position calculation: align right edge with anchor while staying within screen bounds
            int[] location = new int[2];
            anchor.getLocationOnScreen(location);
            int anchorX = location[0];
            int screenWidth = context.getResources().getDisplayMetrics().widthPixels;
            int xOffset;
            if (anchorX + popupWidth > screenWidth - dp(context, 12)) {
                xOffset = -popupWidth + anchor.getWidth() + dp(context, 4);
            } else {
                xOffset = 0;
            }

            currentPopup = popup;
            popup.setOnDismissListener(() -> {
                if (currentPopup == popup) {
                    currentPopup = null;
                }
            });

            popup.showAsDropDown(anchor, xOffset, dp(context, 8));

        } catch (Exception e) {
            e.printStackTrace();
            showSupportDialog(context);
        }
    }

    /**
     * Shows support in a dialog mode (e.g. if anchor is unavailable or invoked globally).
     */
    public static void showSupportDialog(Context context) {
        if (context == null) return;

        try {
            Dialog dialog = new Dialog(context);
            dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);

            View view = LayoutInflater.from(context).inflate(R.layout.layout_help_popup, null);
            dialog.setContentView(view);

            Window window = dialog.getWindow();
            if (window != null) {
                window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
                window.setLayout(dp(context, 290), ViewGroup.LayoutParams.WRAP_CONTENT);
                window.setDimAmount(0.45f);
                window.getAttributes().windowAnimations = android.R.style.Animation_Dialog;
            }

            // Option 1: Call Support
            View btnCall = view.findViewById(R.id.helpBtnCall);
            if (btnCall != null) {
                btnCall.setOnClickListener(v -> {
                    dialog.dismiss();
                    makePhoneCall(context);
                });
            }

            // Option 2: WhatsApp Chat
            View btnWhatsApp = view.findViewById(R.id.helpBtnWhatsApp);
            if (btnWhatsApp != null) {
                btnWhatsApp.setOnClickListener(v -> {
                    dialog.dismiss();
                    openWhatsApp(context, "Hello Patholab Cloud Support, I need assistance with my laboratory.");
                });
            }

            // Option 3: Email Support
            View btnEmail = view.findViewById(R.id.helpBtnEmail);
            if (btnEmail != null) {
                btnEmail.setOnClickListener(v -> {
                    dialog.dismiss();
                    sendEmail(context);
                });
            }

            // Option 4: Support Portal
            View btnDashboard = view.findViewById(R.id.helpBtnDashboard);
            if (btnDashboard != null) {
                btnDashboard.setOnClickListener(v -> {
                    dialog.dismiss();
                    openDashboard(context);
                });
            }

            dialog.setCancelable(true);
            dialog.setCanceledOnTouchOutside(true);
            dialog.show();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void makePhoneCall(Context context) {
        try {
            Intent intent = new Intent(Intent.ACTION_DIAL);
            intent.setData(Uri.parse("tel:" + SUPPORT_PHONE));
            context.startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(context, "Call: " + SUPPORT_PHONE_DISPLAY, Toast.LENGTH_SHORT).show();
        }
    }

    public static void openWhatsApp(Context context, String message) {
        try {
            String cleanPhone = SUPPORT_PHONE.replaceAll("[^0-9]", "");
            String url = "https://api.whatsapp.com/send?phone=" + cleanPhone + "&text=" + Uri.encode(message);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setData(Uri.parse(url));
            context.startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(context, "WhatsApp not available. Please call: " + SUPPORT_PHONE_DISPLAY, Toast.LENGTH_SHORT).show();
        }
    }

    public static void sendEmail(Context context) {
        try {
            Intent intent = new Intent(Intent.ACTION_SENDTO);
            intent.setData(Uri.parse("mailto:" + SUPPORT_EMAIL));
            intent.putExtra(Intent.EXTRA_SUBJECT, "Patholab Cloud Assistance Request");
            context.startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(context, "Email: " + SUPPORT_EMAIL, Toast.LENGTH_SHORT).show();
        }
    }

    public static void openDashboard(Context context) {
        try {
            Intent intent = new Intent(context, SupportActivity.class);
            if (!(context instanceof android.app.Activity)) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            }
            context.startActivity(intent);
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Intent.ACTION_VIEW, Uri.parse(SUPPORT_DASHBOARD_URL));
                context.startActivity(fallback);
            } catch (Exception ignored) {
                Toast.makeText(context, "Support Portal: " + SUPPORT_DASHBOARD_URL, Toast.LENGTH_SHORT).show();
            }
        }
    }

    private static int dp(Context context, int val) {
        if (context == null) return val * 2;
        return (int) (val * context.getResources().getDisplayMetrics().density + 0.5f);
    }
}

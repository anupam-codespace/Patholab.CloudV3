package cloud.patholab.app.auth;

import android.app.Activity;
import android.media.MediaPlayer;
import android.net.Uri;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.VideoView;
import cloud.patholab.app.R;

public class AuthHelper {
    public static void setupVideoBackground(final Activity activity) {
        try {
            final ViewGroup contentParent = (ViewGroup) activity.findViewById(android.R.id.content);
            if (contentParent == null || contentParent.getChildCount() == 0) return;
            
            final View originalContentView = contentParent.getChildAt(0);
            contentParent.removeView(originalContentView);
            
            FrameLayout newRoot = new FrameLayout(activity);
            newRoot.setLayoutParams(new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT));
            
            final VideoView videoView = new VideoView(activity);
            videoView.setLayoutParams(new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT));
            videoView.setAlpha(0.10f); // 10% opacity
            newRoot.addView(videoView);
            
            originalContentView.setBackground(null);
            newRoot.addView(originalContentView);
            
            contentParent.addView(newRoot);
            newRoot.setBackgroundResource(R.drawable.bg_auth_gradient);
            
            Uri videoUri = Uri.parse("android.resource://" + activity.getPackageName() + "/" + R.raw.auth_bg);
            videoView.setVideoURI(videoUri);
            videoView.setOnPreparedListener(new MediaPlayer.OnPreparedListener() {
                @Override
                public void onPrepared(MediaPlayer mp) {
                    mp.setLooping(true);
                    
                    float videoWidth = mp.getVideoWidth();
                    float videoHeight = mp.getVideoHeight();
                    float boxWidth = videoView.getWidth();
                    float boxHeight = videoView.getHeight();
                    
                    if (videoWidth > 0 && videoHeight > 0 && boxWidth > 0 && boxHeight > 0) {
                        float scaleX = boxWidth / videoWidth;
                        float scaleY = boxHeight / videoHeight;
                        float scale = Math.max(scaleX, scaleY);
                        
                        videoView.setScaleX(scale);
                        videoView.setScaleY(scale);
                    }
                    
                    mp.start();
                }
            });
            
            videoView.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
                @Override
                public void onCompletion(MediaPlayer mp) {
                    videoView.start();
                }
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

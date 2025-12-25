package com.example.Triangle;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private int originalOrientation;
    private WebChromeClient webChromeClient; // Make it a member variable

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();
        final WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(true);

        String newUserAgent = settings.getUserAgentString().replace("; wv", "");
        settings.setUserAgentString(newUserAgent);

        // Instantiate the member variable
        webChromeClient = new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) {
                    onHideCustomView();
                    return;
                }
                customView = view;
                originalOrientation = getRequestedOrientation();
                customViewCallback = callback;

                FrameLayout decor = (FrameLayout) getWindow().getDecorView();
                decor.addView(customView, new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT));
                getWindow().getDecorView().setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                        View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                        View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                        View.SYSTEM_UI_FLAG_FULLSCREEN |
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);

                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
            }

            @Override
            public void onHideCustomView() {
                if (customView == null) {
                    return;
                }
                FrameLayout decor = (FrameLayout) getWindow().getDecorView();
                decor.removeView(customView);
                customView = null;
                getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);

                setRequestedOrientation(originalOrientation);

                if (customViewCallback != null) {
                    customViewCallback.onCustomViewHidden();
                }
                customViewCallback = null;
            }
        };

        webView.setWebChromeClient(webChromeClient);
    }

    @Override
    public void onBackPressed() {
        if (customView != null) {
            // Now we can call it on the member variable
            webChromeClient.onHideCustomView();
        } else {
            super.onBackPressed();
        }
    }
}

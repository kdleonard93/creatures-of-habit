use tauri::{Url, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

/// Hosts the webview is allowed to navigate to. Anything else is opened in
/// the user's default browser instead. Keep in sync with the production URL
/// in `desktop/shell.js` and the CSP in `tauri.conf.json`.
const ALLOWED_HOSTS: [&str; 1] = ["creatures-of-habit-production.up.railway.app"];

/// Converts `target="_blank"` clicks and `window.open` calls into same-window
/// navigations so the `on_navigation` handler below can route external URLs
/// to the system browser. WKWebView has no opener for these by default.
const LINK_INTERCEPT_SCRIPT: &str = r#"
(function () {
  window.open = function (url) {
    if (url) { window.location.href = url; }
    return null;
  };
  document.addEventListener('click', function (event) {
    var anchor = event.target && event.target.closest ? event.target.closest('a[target="_blank"]') : null;
    if (anchor && anchor.href && /^https?:/.test(anchor.href)) {
      event.preventDefault();
      window.location.href = anchor.href;
    }
  }, true);
})();
"#;

fn is_allowed_url(url: &Url) -> bool {
    match url.scheme() {
        // Local shell page (macOS/Linux use tauri://, Windows uses http://tauri.localhost)
        "tauri" | "about" => true,
        "http" | "https" => {
            let host = url.host_str().unwrap_or("");
            host == "tauri.localhost"
                || host == "localhost"
                || host == "127.0.0.1"
                || ALLOWED_HOSTS.contains(&host)
        }
        _ => false,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(if cfg!(debug_assertions) {
                    log::LevelFilter::Debug
                } else {
                    log::LevelFilter::Info
                })
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            let handle = app.handle().clone();
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("".into()))
                .title("Creatures of Habit")
                .inner_size(1280.0, 800.0)
                .min_inner_size(900.0, 600.0)
                .initialization_script(LINK_INTERCEPT_SCRIPT)
                .on_navigation(move |url| {
                    if is_allowed_url(url) {
                        return true;
                    }
                    log::info!("opening external url in system browser: {url}");
                    if let Err(error) = handle.opener().open_url(url.as_str(), None::<&str>) {
                        log::error!("failed to open external url: {error}");
                    }
                    false
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_local_and_production_urls() {
        for url in [
            "tauri://localhost/",
            "http://tauri.localhost/",
            "http://localhost:5175/dashboard",
            "https://creatures-of-habit-production.up.railway.app/login",
        ] {
            assert!(is_allowed_url(&Url::parse(url).unwrap()), "{url} should be allowed");
        }
    }

    #[test]
    fn blocks_external_urls() {
        for url in [
            "https://example.com/",
            "https://github.com/kdleonard93/creatures-of-habit",
            "https://evil.creatures-of-habit-production.up.railway.app.attacker.com/",
        ] {
            assert!(!is_allowed_url(&Url::parse(url).unwrap()), "{url} should be blocked");
        }
    }
}

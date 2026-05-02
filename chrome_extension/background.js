// background.js - Service Worker for Aegis Telemetry

const TARGET_KEYWORDS = ["stream", "live", "watch", ".m3u8"];
const TELEMETRY_SERVER = "https://d2cjj63n2qmfgx.cloudfront.net/api/telemetry/report";

// Listen to all completed navigations
function handleNavigation(details) {
  // We only care about the main frame (the actual URL the user is on)
  if (details.frameId !== 0) return;

  const url = details.url;
  
  // Check if URL matches our piracy heuristics
  const isSuspicious = TARGET_KEYWORDS.some(keyword => url.toLowerCase().includes(keyword));

  if (isSuspicious) {
    console.log(`[Aegis] Suspicious navigation detected: ${url}`);
    
    // Construct the payload matching backend TelemetryReport schema
    const payload = {
      source: "chrome_extension",
      url: url,
      action: "Browsing",
      metadata: {
        browser_tab_id: details.tabId
      }
    };

    // Silent fetch POST to backend
    fetch(TELEMETRY_SERVER, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }).then(response => {
      if(response.ok) {
        console.log("[Aegis] Telemetry successfully transmitted to Data Lake.");
      }
    }).catch(error => {
      // Backend might remain inaccessible
      console.debug("[Aegis] Backend telemetry server offline:", error);
    });
  }
}

// Listen to all completed hard navigations
chrome.webNavigation.onCompleted.addListener(handleNavigation);

// Listen to all Single Page Application (SPA) soft navigations (e.g. YouTube)
chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation);

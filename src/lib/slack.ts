// src/lib/slack.ts

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

export async function sendSlackAlert(message: string, type: 'info' | 'success' | 'error' = 'info') {
  if (!SLACK_WEBHOOK) {
    console.warn("⚠️ Slack Webhook URL missing in .env");
    return;
  }

  // Define colors for the side bar of the message
  const colors = {
    info: "#3b82f6",    // Blue
    success: "#22c55e", // Green
    error: "#ef4444"    // Red
  };

  try {
    const response = await fetch(SLACK_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attachments: [
          {
            color: colors[type], // Color code bar
            text: message,       // Main text
            mrkdwn_in: ["text"], // Enable markdown (bold, italics)
            footer: "Globiz Patholab System",
            ts: Math.floor(Date.now() / 1000) // Timestamp
          }
        ]
      }),
    });

    if (!response.ok) {
      console.error("Slack API Error:", await response.text());
    }
  } catch (error) {
    console.error("Failed to send Slack alert:", error);
  }
}
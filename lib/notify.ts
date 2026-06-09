/**
 * lib/notify.ts
 *
 * A lightweight utility to send notifications to Discord or Telegram.
 * It checks the environment variables to determine which platform to use.
 */

export async function notify(message: string) {
  // We run this without awaiting it in the routes so it doesn't block the user's request
  try {
    const discordUrl = process.env.DISCORD_WEBHOOK_URL;
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    // 1. Try Discord
    if (discordUrl) {
      await fetch(discordUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      });
    }

    // 2. Try Telegram
    if (telegramToken && telegramChatId) {
      await fetch(
        `https://api.telegram.org/bot${telegramToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: message,
            parse_mode: "Markdown",
          }),
        }
      );
    }

    if (!discordUrl && (!telegramToken || !telegramChatId)) {
      console.warn("notify() called but no webhook URL/Token is configured in env.");
    }
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

import { Injectable } from "@nestjs/common";

type NotificationEmailPayload = {
  to: string;
  subject: string;
  body: string;
};

@Injectable()
export class NotificationEmailService {
  private readonly fromAddress =
    process.env.NOTIFICATIONS_EMAIL_FROM ?? "no-reply@pharma-bet.local";

  resolveRecipient(userId: string): string | null {
    if (userId.includes("@")) {
      return userId;
    }
    return null;
  }

  async sendNotificationEmail(payload: NotificationEmailPayload): Promise<void> {
    const mode = process.env.NOTIFICATIONS_EMAIL_MODE ?? "console";
    if (mode !== "console") {
      console.info(
        `[notifications] Email mode "${mode}" not configured; falling back to console output.`,
      );
    }
    console.info(
      `[notifications][email] from=${this.fromAddress} to=${payload.to} subject="${payload.subject}" body="${payload.body}"`,
    );
  }
}

export class NotificationService {
  constructor() {}

  async sendWhatsAppConfirmation(toPhone: string, orderNumber: string, grandTotal: number): Promise<void> {
    const textMessage = `Thank you for your purchase from GEETEJ VIRAASAT! Your order #${orderNumber} for a total of INR ${grandTotal} is confirmed. We will share tracking details once shipped.`;
    console.log(`[MOCK WHATSAPP] To: ${toPhone} | Message: "${textMessage}"`);
  }
}

export const notificationService = new NotificationService();

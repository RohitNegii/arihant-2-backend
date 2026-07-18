export interface IShippingProvider {
  createShipment(order: any): Promise<{ trackingNumber: string; courierName: string; expectedDelivery: Date }>;
  trackShipment(trackingNumber: string): Promise<any>;
}

export class ManualShippingProvider implements IShippingProvider {
  async createShipment(order: any) {
    // Return placeholder values that can be updated manually by the admin in the dashboard.
    return {
      trackingNumber: `MAN-${Date.now()}`,
      courierName: "Manual Shipping",
      expectedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
    };
  }

  async trackShipment(trackingNumber: string) {
    return {
      status: "Processing",
      trackingNumber,
      updates: []
    };
  }
}

export const shippingService = new ManualShippingProvider();

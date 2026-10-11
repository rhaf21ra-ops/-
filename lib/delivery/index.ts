/**
 * Delivery provider layer. Every provider implements DeliveryProvider.
 * Only "manual" works today: no Yemeni delivery company has a documented public API that we could verify,
 * so a company is added here ONLY after it gives us API docs/credentials and an integration is tested.
 * Until then the UI must not claim live tracking or automatic dispatch for that company.
 */
export type ShipmentStatus = "new" | "preparing" | "picked_up" | "on_the_way" | "delivered" | "delivery_failed";

export type ShipmentRequest = {
  orderId: string;
  recipientName: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  codAmount: number; // cash the courier must collect (0 if already paid / installment)
};

export type ShipmentResult = { trackingNumber: string; externalId?: string };

export interface DeliveryProvider {
  readonly code: string;
  /** false = we cannot dispatch or poll automatically; a person updates the status. */
  readonly automated: boolean;
  createShipment(req: ShipmentRequest): Promise<ShipmentResult>;
  getStatus(trackingNumber: string): Promise<ShipmentStatus>;
}

class ManualProvider implements DeliveryProvider {
  readonly code = "manual";
  readonly automated = false;
  async createShipment(req: ShipmentRequest): Promise<ShipmentResult> {
    // The merchant/staff enters the courier's tracking number in the dashboard; we only record it.
    return { trackingNumber: `MAN-${req.orderId.slice(0, 8).toUpperCase()}` };
  }
  async getStatus(): Promise<ShipmentStatus> {
    throw new Error("Manual provider has no live status; read it from the shipments table");
  }
}

const providers: Record<string, DeliveryProvider> = { manual: new ManualProvider() };

export function getDeliveryProvider(code: string): DeliveryProvider {
  const p = providers[code];
  if (!p) throw new Error(`Delivery provider "${code}" is not integrated`);
  return p;
}

export const isAutomated = (code: string) => providers[code]?.automated ?? false;

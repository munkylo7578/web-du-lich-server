export type TourServiceSnapshot = { serviceId: string; sortOrder: number };

export class TourService {
  private constructor(public readonly serviceId: string, public readonly sortOrder: number) {}
  static create(snapshot: TourServiceSnapshot): TourService {
    if (!snapshot.serviceId.trim()) throw new Error("Service id is required.");
    if (!Number.isInteger(snapshot.sortOrder) || snapshot.sortOrder < 0) throw new Error("Service order is invalid.");
    return new TourService(snapshot.serviceId, snapshot.sortOrder);
  }
  static fromSnapshot(snapshot: TourServiceSnapshot) { return TourService.create(snapshot); }
  toSnapshot(): TourServiceSnapshot { return { serviceId: this.serviceId, sortOrder: this.sortOrder }; }
}

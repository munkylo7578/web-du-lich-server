import type { Image } from "@/domains/image/domain";
import type { Service } from "./service";

export type ServiceSaveImage = { image: Image; physicalPath: string };

export interface ServiceRepository {
  findById(id: string): Promise<Service | null>;
  save(service: Service, newImages?: ServiceSaveImage[]): Promise<void>;
  delete(id: string): Promise<void>;
}

export class EntityId {
  protected constructor(public readonly value: string) {}

  equals(other: EntityId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  protected static createValue(value: string | undefined, label: string): string {
    const id = value?.trim() || crypto.randomUUID();

    if (!id) {
      throw new Error(`${label} is required.`);
    }

    return id;
  }
}

export type TariffPlanRecord = {
  id: string;
  slug: string;
  name: string;
  tokenAmount: number;
  durationDays: number;
  active: boolean;
  sortOrder: number;
};

type TariffPlanDelegate = {
  findMany(args: { orderBy: Record<string, string> }): Promise<TariffPlanRecord[]>;
  findUnique(args: { where: { slug?: string; id?: string } }): Promise<TariffPlanRecord | null>;
  update(args: { where: { id: string }; data: Partial<TariffPlanRecord> }): Promise<TariffPlanRecord>;
  create(args: { data: Omit<TariffPlanRecord, "id"> }): Promise<TariffPlanRecord>;
};

export function createTariffPlanRepository(delegate: TariffPlanDelegate) {
  return {
    listAll(): Promise<TariffPlanRecord[]> {
      return delegate.findMany({ orderBy: { sortOrder: "asc" } });
    },
    findBySlug(slug: string): Promise<TariffPlanRecord | null> {
      return delegate.findUnique({ where: { slug } });
    },
    findById(id: string): Promise<TariffPlanRecord | null> {
      return delegate.findUnique({ where: { id } });
    },
    update(id: string, data: Partial<Omit<TariffPlanRecord, "id" | "slug">>): Promise<TariffPlanRecord> {
      return delegate.update({ where: { id }, data });
    },
    create(data: Omit<TariffPlanRecord, "id">): Promise<TariffPlanRecord> {
      return delegate.create({ data });
    },
    async toggleActive(id: string): Promise<TariffPlanRecord> {
      const plan = await delegate.findUnique({ where: { id } });
      if (!plan) throw new Error("Tariff plan not found");
      return delegate.update({ where: { id }, data: { active: !plan.active } });
    },
  };
}
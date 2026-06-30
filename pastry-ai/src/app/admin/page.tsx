import { Card } from "@/components/ui/card";

const cards = [
  { label: "Пользователи", value: "0" },
  { label: "Запросы", value: "0" },
  { label: "Расходы AI", value: "$0.00" },
  { label: "Подписки", value: "0" },
  { label: "Ошибки", value: "0" },
];

export default function AdminDashboardPage() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold">Панель</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label}>
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold">{card.value}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

import { Card } from "@/components/ui/card";

const cards = [
  { label: "Users", value: "0" },
  { label: "Requests", value: "0" },
  { label: "AI Cost", value: "$0.00" },
  { label: "Subscriptions", value: "0" },
  { label: "Errors", value: "0" },
];

export default function AdminDashboardPage() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold">Dashboard</h2>
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

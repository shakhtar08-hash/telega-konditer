export async function syncFunnelSteps(model, rows) {
  for (const row of rows) {
    const { slug, ...data } = row;

    await model.upsert({
      where: { slug },
      update: data,
      create: row,
    });
  }
}

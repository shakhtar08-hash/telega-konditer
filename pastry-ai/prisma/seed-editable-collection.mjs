export async function seedEditableCollection(model, rows) {
  const existingCount = await model.count();

  if (existingCount > 0) {
    return;
  }

  for (const row of rows) {
    await model.create({
      data: row,
    });
  }
}

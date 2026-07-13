// Temporary compatibility surface for adjacent legacy tests.
// Task 4 removed the old triggerMessage-based admin runtime path, so these
// placeholders intentionally perform no persistence until Task 5 replaces them
// with the new TriggerRule create/edit actions.

export async function createTriggerMessage(formData: FormData) {
  "use server";

  void formData;
}

export async function updateTriggerMessage(formData: FormData) {
  "use server";

  void formData;
}

export async function deleteTriggerMessage(formData: FormData) {
  "use server";

  void formData;
}

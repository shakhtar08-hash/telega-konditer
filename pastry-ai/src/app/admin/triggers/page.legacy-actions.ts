// Temporary compatibility surface for adjacent legacy tests.
// Task 4 removed the old triggerMessage-based admin runtime path.
// These exports now fail loudly so nothing can silently appear to succeed
// before Task 5 replaces them with real TriggerRule create/edit actions.

const LEGACY_ACTION_ERROR =
  "Legacy trigger actions moved out of the Task 4 list page. Task 5 replaces this compatibility surface with TriggerRule actions.";

export async function createTriggerMessage(formData: FormData) {
  "use server";

  void formData;

  throw new Error(LEGACY_ACTION_ERROR);
}

export async function updateTriggerMessage(formData: FormData) {
  "use server";

  void formData;

  throw new Error(LEGACY_ACTION_ERROR);
}

export async function deleteTriggerMessage(formData: FormData) {
  "use server";

  void formData;

  throw new Error(LEGACY_ACTION_ERROR);
}

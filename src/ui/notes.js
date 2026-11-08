export const TOAST_LIFE = 4200;

export function pushNote(ui, text, kind = 'info') {
  if (!ui?.notes) return;
  ui.notes.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    kind,
    at: Date.now()
  });
  ui.notes = ui.notes.slice(0, 5);
}

export function pruneNotes(ui, now = Date.now()) {
  if (!ui?.notes) return;
  ui.notes = ui.notes.filter((note) => now - (note.at ?? now) < TOAST_LIFE);
}

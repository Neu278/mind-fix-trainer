import type { SolveResult } from "./gemini";

const API_KEY = "ttosok.geminiApiKey";
const NOTES_KEY = "ttosok.notes.v1";

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(API_KEY) ?? "";
}
export function setApiKey(k: string) {
  window.localStorage.setItem(API_KEY, k);
}
export function clearApiKey() {
  window.localStorage.removeItem(API_KEY);
}

export type Note = {
  id: string;
  createdAt: number;
  imageDataUrl: string;
  result: SolveResult;
  memo: string;
  mastered: boolean;
};

export function listNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Note[];
  } catch {
    return [];
  }
}
export function saveNotes(notes: Note[]) {
  window.localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}
export function addNote(n: Note) {
  const notes = listNotes();
  notes.unshift(n);
  saveNotes(notes);
}
export function updateNote(id: string, patch: Partial<Note>) {
  const notes = listNotes().map((n) => (n.id === id ? { ...n, ...patch } : n));
  saveNotes(notes);
}
export function deleteNote(id: string) {
  saveNotes(listNotes().filter((n) => n.id !== id));
}

const STORAGE_KEY = "when2hangout.participantToken";

export function getStoredParticipantToken(storage: Storage = window.localStorage): string | null {
  return storage.getItem(STORAGE_KEY);
}

export function saveParticipantToken(token: string, storage: Storage = window.localStorage): void {
  storage.setItem(STORAGE_KEY, token);
}

export function createParticipantToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

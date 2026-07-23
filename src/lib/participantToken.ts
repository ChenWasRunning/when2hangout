const LEGACY_STORAGE_KEY = "when2hangout.participantToken";
const ACTIVE_STORAGE_KEY = "when2hangout.activeParticipantToken";
const TOKENS_BY_NAME_STORAGE_KEY = "when2hangout.participantTokensByName";

type StoredTokenMap = Record<string, string>;

export function getStoredParticipantToken(storage: Storage = window.localStorage): string | null {
  return storage.getItem(ACTIVE_STORAGE_KEY) ?? storage.getItem(LEGACY_STORAGE_KEY);
}

export function saveParticipantToken(token: string, storage: Storage = window.localStorage): void {
  storage.setItem(ACTIVE_STORAGE_KEY, token);
  storage.setItem(LEGACY_STORAGE_KEY, token);
}

export function getParticipantTokenForName(
  displayName: string,
  storage: Storage = window.localStorage,
): string | null {
  return readTokenMap(storage)[tokenMapKey(displayName)] ?? null;
}

export function saveParticipantTokenForName(
  displayName: string,
  token: string,
  storage: Storage = window.localStorage,
): void {
  const tokenMap = readTokenMap(storage);
  tokenMap[tokenMapKey(displayName)] = token;
  storage.setItem(TOKENS_BY_NAME_STORAGE_KEY, JSON.stringify(tokenMap));
  saveParticipantToken(token, storage);
}

export function createParticipantToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function tokenMapKey(displayName: string): string {
  return displayName.trim();
}

function readTokenMap(storage: Storage): StoredTokenMap {
  const rawValue = storage.getItem(TOKENS_BY_NAME_STORAGE_KEY);
  if (!rawValue) {
    return {};
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" &&
          typeof entry[1] === "string" &&
          /^[a-f0-9]{64}$/i.test(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

const DATABASE_NAME = "badgeflow";
const DATABASE_VERSION = 1;
const STORE_NAME = "projects";
const ACTIVE_PROJECT_KEY = "active-project";
const LEGACY_LOCAL_STORAGE_KEY = "badgeflow-project-v1";

export type StorageMode = "indexeddb" | "localstorage";

type StoredDraft<T> = {
  key: typeof ACTIVE_PROJECT_KEY;
  updatedAt: string;
  value: T;
};

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open IndexedDB."));
    request.onblocked = () =>
      reject(new Error("IndexedDB upgrade is blocked by another tab."));
  });
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionComplete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
  });
}

async function readIndexedDbDraft<T>() {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const stored = await requestResult(
      transaction
        .objectStore(STORE_NAME)
        .get(ACTIVE_PROJECT_KEY) as IDBRequest<StoredDraft<T> | undefined>,
    );
    return stored?.value ?? null;
  } finally {
    database.close();
  }
}

async function writeIndexedDbDraft<T>(value: T) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const completed = transactionComplete(transaction);
    await Promise.all([
      requestResult(
        transaction.objectStore(STORE_NAME).put({
          key: ACTIVE_PROJECT_KEY,
          updatedAt: new Date().toISOString(),
          value,
        } satisfies StoredDraft<T>),
      ),
      completed,
    ]);
  } finally {
    database.close();
  }
}

export async function loadProjectDraft<T>() {
  try {
    const indexedDbDraft = await readIndexedDbDraft<T>();
    if (indexedDbDraft) return indexedDbDraft;
  } catch {
    // Private browsing and embedded browsers may disable IndexedDB.
  }

  if (typeof localStorage === "undefined") return null;
  try {
    const legacyDraft = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
    if (!legacyDraft) return null;
    return JSON.parse(legacyDraft) as T;
  } catch {
    try {
      localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
    } catch {
      // Storage access can be denied by browser privacy settings.
    }
    return null;
  }
}

export async function saveProjectDraft<T>(value: T): Promise<StorageMode> {
  try {
    await writeIndexedDbDraft(value);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
    }
    return "indexeddb";
  } catch {
    if (typeof localStorage === "undefined") {
      throw new Error("Browser storage is unavailable.");
    }
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEY, JSON.stringify(value));
    return "localstorage";
  }
}

export async function clearProjectDraft() {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
    } catch {
      // Continue clearing IndexedDB when localStorage access is denied.
    }
  }

  try {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const completed = transactionComplete(transaction);
      await Promise.all([
        requestResult(
          transaction.objectStore(STORE_NAME).delete(ACTIVE_PROJECT_KEY),
        ),
        completed,
      ]);
    } finally {
      database.close();
    }
  } catch {
    // Clearing the legacy fallback is sufficient when IndexedDB is unavailable.
  }
}

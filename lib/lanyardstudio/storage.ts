const DATABASE_NAME = "lanyardstudio";
const DATABASE_VERSION = 1;
const STORE_NAME = "projects";
const LEGACY_ACTIVE_PROJECT_KEY = "active-project";
const ACTIVE_PROJECT_ID_KEY = "active-project-id";
const PROJECT_KEY_PREFIX = "project:";
const LOCAL_PROJECTS_KEY = "lanyardstudio-projects-v2";
const PREVIOUS_DATABASE_TOKEN = "YmFkZ2VmbG93";
const PREVIOUS_SINGLE_PROJECT_TOKEN = "YmFkZ2VmbG93LXByb2plY3QtdjE=";
const PREVIOUS_PROJECTS_TOKEN = "YmFkZ2VmbG93LXByb2plY3RzLXYy";

export type StorageMode = "indexeddb" | "localstorage";

export type StoredProjectSummary = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  badgeWidth: number;
  badgeHeight: number;
  rowCount: number;
  outputMode: string;
};

export type StoredProject<T> = StoredProjectSummary & {
  value: T;
};

type IndexedProject<T> = StoredProject<T> & {
  key: string;
};

type LegacyStoredDraft<T> = {
  key: typeof LEGACY_ACTIVE_PROJECT_KEY;
  updatedAt: string;
  value: T;
};

type ActiveProjectPointer = {
  key: typeof ACTIVE_PROJECT_ID_KEY;
  projectId: string;
};

type LocalProjectCollection<T> = {
  activeProjectId: string | null;
  projects: StoredProject<T>[];
};

let indexedDbMigration: Promise<void> | null = null;

function decodePreviousIdentifier(token: string) {
  try {
    return globalThis.atob(token);
  } catch {
    return "";
  }
}

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

function openPreviousDatabase() {
  return new Promise<IDBDatabase | null>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const name = decodePreviousIdentifier(PREVIOUS_DATABASE_TOKEN);
    if (!name || name === DATABASE_NAME) {
      resolve(null);
      return;
    }

    let createdEmptyDatabase = false;
    const request = indexedDB.open(name);
    request.onupgradeneeded = () => {
      createdEmptyDatabase = true;
    };
    request.onsuccess = () => {
      const database = request.result;
      if (
        createdEmptyDatabase ||
        !database.objectStoreNames.contains(STORE_NAME)
      ) {
        database.close();
        if (createdEmptyDatabase) indexedDB.deleteDatabase(name);
        resolve(null);
        return;
      }
      resolve(database);
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Could not read previous IndexedDB."));
    request.onblocked = () => resolve(null);
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

function removePreviousDatabase() {
  return new Promise<void>((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve();
      return;
    }
    const name = decodePreviousIdentifier(PREVIOUS_DATABASE_TOKEN);
    if (!name || name === DATABASE_NAME) {
      resolve();
      return;
    }
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

async function migratePreviousIndexedDb() {
  const previousDatabase = await openPreviousDatabase();
  if (!previousDatabase) return;

  let previousRecords: Array<
    IndexedProject<unknown> | LegacyStoredDraft<unknown> | ActiveProjectPointer
  > = [];
  try {
    const transaction = previousDatabase.transaction(STORE_NAME, "readonly");
    previousRecords = await requestResult(
      transaction.objectStore(STORE_NAME).getAll() as IDBRequest<
        Array<
          | IndexedProject<unknown>
          | LegacyStoredDraft<unknown>
          | ActiveProjectPointer
        >
      >,
    );
  } finally {
    previousDatabase.close();
  }

  if (previousRecords.length) {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const completed = transactionComplete(transaction);
      const store = transaction.objectStore(STORE_NAME);
      const currentRecords = await requestResult(
        store.getAll() as IDBRequest<Array<{ key: string; updatedAt?: string }>>,
      );
      const currentByKey = new Map(
        currentRecords.map((record) => [record.key, record] as const),
      );
      previousRecords.forEach((record) => {
        const current = currentByKey.get(record.key);
        const previousUpdatedAt =
          "updatedAt" in record ? record.updatedAt : undefined;
        const currentUpdatedAt = current?.updatedAt;
        if (
          !current ||
          (previousUpdatedAt &&
            (!currentUpdatedAt || previousUpdatedAt > currentUpdatedAt))
        ) {
          store.put(record);
        }
      });
      await completed;
    } finally {
      database.close();
    }
  }

  await removePreviousDatabase();
}

function ensureIndexedDbMigration() {
  indexedDbMigration ??= migratePreviousIndexedDb().catch(() => undefined);
  return indexedDbMigration;
}

function makeProjectId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function makeLegacyProject<T>(draft: LegacyStoredDraft<T>): StoredProject<T> {
  const value: Record<string, unknown> = isRecord(draft.value)
    ? draft.value
    : {};
  const badgeWidth = finiteNumber(value.badgeWidth, 95);
  const badgeHeight = finiteNumber(value.badgeHeight, 123);
  const updatedAt =
    typeof value.updatedAt === "string" ? value.updatedAt : draft.updatedAt;
  return {
    id: makeProjectId(),
    name: `${badgeWidth} × ${badgeHeight} mm`,
    createdAt: updatedAt,
    updatedAt,
    badgeWidth,
    badgeHeight,
    rowCount: Array.isArray(value.rows) ? value.rows.length : 0,
    outputMode:
      typeof value.outputMode === "string" ? value.outputMode : "standard",
    value: draft.value,
  };
}

function toIndexedProject<T>(project: StoredProject<T>): IndexedProject<T> {
  return {
    ...project,
    key: `${PROJECT_KEY_PREFIX}${project.id}`,
  };
}

function toSummary<T>(project: StoredProject<T>): StoredProjectSummary {
  const { value: _value, ...summary } = project;
  return summary;
}

function sortProjects<T>(projects: StoredProject<T>[]) {
  return [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function readIndexedDbProjects<T>() {
  await ensureIndexedDbMigration();
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const records = await requestResult(
      store.getAll() as IDBRequest<
        Array<IndexedProject<T> | LegacyStoredDraft<T> | ActiveProjectPointer>
      >,
    );
    let projects = records.filter(
      (record): record is IndexedProject<T> =>
        typeof record.key === "string" &&
        record.key.startsWith(PROJECT_KEY_PREFIX) &&
        "value" in record,
    );

    if (!projects.length) {
      const legacy = records.find(
        (record): record is LegacyStoredDraft<T> =>
          record.key === LEGACY_ACTIVE_PROJECT_KEY && "value" in record,
      );
      if (legacy) {
        const migrated = makeLegacyProject(legacy);
        const indexed = toIndexedProject(migrated);
        const migration = database.transaction(STORE_NAME, "readwrite");
        const migrationCompleted = transactionComplete(migration);
        const migrationStore = migration.objectStore(STORE_NAME);
        migrationStore.put(indexed);
        migrationStore.put({
          key: ACTIVE_PROJECT_ID_KEY,
          projectId: migrated.id,
        } satisfies ActiveProjectPointer);
        migrationStore.delete(LEGACY_ACTIVE_PROJECT_KEY);
        await migrationCompleted;
        projects = [indexed];
      }
    }

    return sortProjects(projects.map(({ key: _key, ...project }) => project));
  } finally {
    database.close();
  }
}

async function readIndexedDbProject<T>(projectId: string) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const stored = await requestResult(
      transaction
        .objectStore(STORE_NAME)
        .get(`${PROJECT_KEY_PREFIX}${projectId}`) as IDBRequest<
        IndexedProject<T> | undefined
      >,
    );
    if (!stored) return null;
    const { key: _key, ...project } = stored;
    return project;
  } finally {
    database.close();
  }
}

async function writeIndexedDbProject<T>(project: StoredProject<T>) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const completed = transactionComplete(transaction);
    const store = transaction.objectStore(STORE_NAME);
    store.put(toIndexedProject(project));
    store.put({
      key: ACTIVE_PROJECT_ID_KEY,
      projectId: project.id,
    } satisfies ActiveProjectPointer);
    await completed;
  } finally {
    database.close();
  }
}

async function deleteIndexedDbProject(projectId: string) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const completed = transactionComplete(transaction);
    const store = transaction.objectStore(STORE_NAME);
    store.delete(`${PROJECT_KEY_PREFIX}${projectId}`);
    store.delete(ACTIVE_PROJECT_ID_KEY);
    await completed;
  } finally {
    database.close();
  }
}

function readLocalProjects<T>(): LocalProjectCollection<T> {
  if (typeof localStorage === "undefined") {
    return { activeProjectId: null, projects: [] };
  }

  try {
    const stored = localStorage.getItem(LOCAL_PROJECTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as LocalProjectCollection<T>;
      if (Array.isArray(parsed.projects)) return parsed;
    }

    const previousProjectsKey = decodePreviousIdentifier(
      PREVIOUS_PROJECTS_TOKEN,
    );
    const previousCollection = previousProjectsKey
      ? localStorage.getItem(previousProjectsKey)
      : null;
    if (previousCollection) {
      const parsed = JSON.parse(
        previousCollection,
      ) as LocalProjectCollection<T>;
      if (Array.isArray(parsed.projects)) {
        localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(parsed));
        localStorage.removeItem(previousProjectsKey);
        return parsed;
      }
    }

    const previousSingleProjectKey = decodePreviousIdentifier(
      PREVIOUS_SINGLE_PROJECT_TOKEN,
    );
    const previousProject = previousSingleProjectKey
      ? localStorage.getItem(previousSingleProjectKey)
      : null;
    if (!previousProject) return { activeProjectId: null, projects: [] };
    const value = JSON.parse(previousProject) as T;
    const updatedAt =
      isRecord(value) && typeof value.updatedAt === "string"
        ? value.updatedAt
        : new Date().toISOString();
    const migrated = makeLegacyProject({
      key: LEGACY_ACTIVE_PROJECT_KEY,
      updatedAt,
      value,
    });
    const collection = {
      activeProjectId: migrated.id,
      projects: [migrated],
    };
    localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(collection));
    localStorage.removeItem(previousSingleProjectKey);
    return collection;
  } catch {
    return { activeProjectId: null, projects: [] };
  }
}

function writeLocalProjects<T>(collection: LocalProjectCollection<T>) {
  if (typeof localStorage === "undefined") {
    throw new Error("Browser storage is unavailable.");
  }
  localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(collection));
  const previousProjectsKey = decodePreviousIdentifier(PREVIOUS_PROJECTS_TOKEN);
  const previousSingleProjectKey = decodePreviousIdentifier(
    PREVIOUS_SINGLE_PROJECT_TOKEN,
  );
  if (previousProjectsKey) localStorage.removeItem(previousProjectsKey);
  if (previousSingleProjectKey) {
    localStorage.removeItem(previousSingleProjectKey);
  }
}

export async function listProjectDrafts<T>() {
  try {
    const indexedProjects = await readIndexedDbProjects<T>();
    const localProjects = sortProjects(readLocalProjects<T>().projects);
    if (localProjects.length) {
      const merged = new Map(
        indexedProjects.map((project) => [project.id, project] as const),
      );
      for (const project of [...localProjects].reverse()) {
        const indexed = merged.get(project.id);
        if (!indexed || project.updatedAt > indexed.updatedAt) {
          await writeIndexedDbProject(project);
          merged.set(project.id, project);
        }
      }
      localStorage.removeItem(LOCAL_PROJECTS_KEY);
      const previousProjectsKey = decodePreviousIdentifier(
        PREVIOUS_PROJECTS_TOKEN,
      );
      if (previousProjectsKey) localStorage.removeItem(previousProjectsKey);
      return sortProjects([...merged.values()]).map(toSummary);
    }
    return indexedProjects.map(toSummary);
  } catch {
    return sortProjects(readLocalProjects<T>().projects).map(toSummary);
  }
}

export async function loadProjectDraft<T>(projectId: string) {
  try {
    const indexedProject = await readIndexedDbProject<T>(projectId);
    if (indexedProject) return indexedProject;
  } catch {
    // Private browsing and embedded browsers may disable IndexedDB.
  }

  return (
    readLocalProjects<T>().projects.find((project) => project.id === projectId) ??
    null
  );
}

export async function saveProjectDraft<T>(
  project: StoredProject<T>,
): Promise<{ mode: StorageMode; summary: StoredProjectSummary }> {
  try {
    await writeIndexedDbProject(project);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(LOCAL_PROJECTS_KEY);
      const previousProjectsKey = decodePreviousIdentifier(
        PREVIOUS_PROJECTS_TOKEN,
      );
      const previousSingleProjectKey = decodePreviousIdentifier(
        PREVIOUS_SINGLE_PROJECT_TOKEN,
      );
      if (previousProjectsKey) localStorage.removeItem(previousProjectsKey);
      if (previousSingleProjectKey) {
        localStorage.removeItem(previousSingleProjectKey);
      }
    }
    return { mode: "indexeddb", summary: toSummary(project) };
  } catch {
    const collection = readLocalProjects<T>();
    const projects = [
      project,
      ...collection.projects.filter((item) => item.id !== project.id),
    ];
    writeLocalProjects({ activeProjectId: project.id, projects });
    return { mode: "localstorage", summary: toSummary(project) };
  }
}

export async function deleteProjectDraft(projectId: string) {
  try {
    await deleteIndexedDbProject(projectId);
  } catch {
    // Continue clearing the local fallback when IndexedDB is unavailable.
  }

  if (typeof localStorage !== "undefined") {
    const collection = readLocalProjects<unknown>();
    writeLocalProjects({
      activeProjectId:
        collection.activeProjectId === projectId
          ? null
          : collection.activeProjectId,
      projects: collection.projects.filter((project) => project.id !== projectId),
    });
  }
}

export async function clearProjectDraft() {
  const projects = await listProjectDrafts<unknown>();
  await Promise.all(projects.map((project) => deleteProjectDraft(project.id)));
}

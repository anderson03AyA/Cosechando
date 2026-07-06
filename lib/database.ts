import * as SQLite from "expo-sqlite";

export type Worker = {
  id: number;
  name: string;
};

export type HarvestEntry = {
  id: number;
  kg: number;
  createdAt: string;
};

export type WorkerTotalKg = {
  id: number;
  name: string;
  totalKg: number;
};

export type HarvestFeedEntry = {
  id: number;
  workerId: number;
  workerName: string;
  kg: number;
  arrobas: number;
  createdAt: string;
  cumulativeKg: number;
  cumulativeArrobas: number;
};

export type TandaOverview = {
  targetArrobas: number;
  totalKg: number;
  totalArrobas: number;
  checkpointArrobas: number;
  progressArrobas: number;
  completedTandas: number;
  nextAlertAtArrobas: number;
  remainingArrobas: number;
};

export type TandaAlertEvent = {
  milestone: number;
  targetArrobas: number;
  totalArrobas: number;
  progressArrobas: number;
  overflowArrobas: number;
  overflowKg: number;
  workerName: string | null;
  triggerKg: number | null;
  reachedArrobas: number;
};

export type TandaRecentReset = {
  id: string;
  workerName: string | null;
  triggerKg: number | null;
  overflowKg: number;
  overflowArrobas: number;
  targetArrobas: number;
  createdAt: string;
};

export type TandaCurrentEntry = {
  id: number;
  workerId: number;
  workerName: string;
  kg: number;
  countedKg: number;
  arrobas: number;
  countedArrobas: number;
  createdAt: string;
};

export type SavedHarvest = {
  id: number;
  name: string;
  createdAt: string;
  pricePerArroba: number;
  workerCount: number;
  totalKg: number;
};

export type SavedHarvestWorker = {
  id: number;
  name: string;
  totalKg: number;
  entries: HarvestEntry[];
};

export type SavedHarvestPreview = {
  harvest: SavedHarvest;
  workers: SavedHarvestWorker[];
};

type SavedHarvestRow = {
  id: number;
  name: string;
  createdAt: string;
  pricePerArroba: number;
};

type SavedWorkerRow = {
  id: number;
  name: string;
};

type SavedEntryRow = {
  kg: number;
  createdAt: string;
};

type HarvestFeedRow = {
  id: number;
  workerId: number;
  workerName: string;
  kg: number;
  createdAt: string;
};

type LatestHarvestRow = {
  id: number;
  workerId: number;
  workerName: string;
  kg: number;
  createdAt: string;
};

type TandaProgressRow = {
  id: number;
  workerId: number;
  workerName: string;
  kg: number;
  createdAt: string;
};

const db = SQLite.openDatabaseSync("cosechando.db");
const DEFAULT_PRICE_PER_ARROBA = 9000;
const DEFAULT_TANDA_TARGET_ARROBAS = 35;
const CURRENT_HARVEST_LABEL_KEY = "current_harvest_label";
const TANDA_TARGET_ARROBAS_KEY = "tanda_target_arrobas";
const TANDA_CHECKPOINT_ARROBAS_KEY = "tanda_checkpoint_arrobas";
const TANDA_LAST_ALERT_CYCLE_KEY = "tanda_last_alert_cycle";
const TANDA_RECENT_RESETS_KEY = "tanda_recent_resets";
const TANDA_ACTIVE_START_HARVEST_ID_KEY = "tanda_active_start_harvest_id";
const TANDA_ACTIVE_START_CONSUMED_KG_KEY = "tanda_active_start_consumed_kg";

let setupPromise: Promise<void> | null = null;

async function setupDatabase() {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS harvests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER NOT NULL,
      kg REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS saved_harvests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      price_per_arroba REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS saved_workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saved_harvest_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY (saved_harvest_id) REFERENCES saved_harvests(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS saved_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saved_worker_id INTEGER NOT NULL,
      kg REAL NOT NULL,
      created_at TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY (saved_worker_id) REFERENCES saved_workers(id) ON DELETE CASCADE
    );
  `);

  await db.runAsync(
    "DELETE FROM harvests WHERE worker_id NOT IN (SELECT id FROM workers)",
  );

  await db.runAsync(
    `
      DELETE FROM saved_entries
      WHERE saved_worker_id NOT IN (SELECT id FROM saved_workers)
    `,
  );

  await db.runAsync(
    `
      DELETE FROM saved_workers
      WHERE saved_harvest_id NOT IN (SELECT id FROM saved_harvests)
    `,
  );

  const existingPrice = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    ["price_per_arroba"],
  );

  if (!existingPrice) {
    await db.runAsync("INSERT INTO settings (key, value) VALUES (?, ?)", [
      "price_per_arroba",
      String(DEFAULT_PRICE_PER_ARROBA),
    ]);
  }

  const existingTandaTarget = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [TANDA_TARGET_ARROBAS_KEY],
  );

  if (!existingTandaTarget) {
    await db.runAsync("INSERT INTO settings (key, value) VALUES (?, ?)", [
      TANDA_TARGET_ARROBAS_KEY,
      String(DEFAULT_TANDA_TARGET_ARROBAS),
    ]);
  }

  const existingTandaCheckpoint = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [TANDA_CHECKPOINT_ARROBAS_KEY],
  );

  if (!existingTandaCheckpoint) {
    await db.runAsync("INSERT INTO settings (key, value) VALUES (?, ?)", [
      TANDA_CHECKPOINT_ARROBAS_KEY,
      "0",
    ]);
  }

  const existingTandaCycle = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [TANDA_LAST_ALERT_CYCLE_KEY],
  );

  if (!existingTandaCycle) {
    await db.runAsync("INSERT INTO settings (key, value) VALUES (?, ?)", [
      TANDA_LAST_ALERT_CYCLE_KEY,
      "0",
    ]);
  }
}

async function ensureDatabaseReady() {
  if (!setupPromise) {
    setupPromise = setupDatabase();
  }

  await setupPromise;
}

async function getSetting(key: string): Promise<string | null> {
  await ensureDatabaseReady();

  const result = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [key],
  );

  return result?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await ensureDatabaseReady();

  await db.runAsync(
    `
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key)
      DO UPDATE SET value = excluded.value
    `,
    [key, value],
  );
}

async function deleteSetting(key: string): Promise<void> {
  await ensureDatabaseReady();

  await db.runAsync("DELETE FROM settings WHERE key = ?", [key]);
}

async function getLatestHarvestRow(): Promise<LatestHarvestRow | null> {
  await ensureDatabaseReady();

  const row = await db.getFirstAsync<LatestHarvestRow>(
    `
      SELECT
        harvests.id AS id,
        workers.id AS workerId,
        workers.name AS workerName,
        harvests.kg AS kg,
        harvests.created_at AS createdAt
      FROM harvests
      INNER JOIN workers ON workers.id = harvests.worker_id
      ORDER BY harvests.id DESC
      LIMIT 1
    `,
  );

  return row ?? null;
}

async function getTandaProgressRows(
  startHarvestId: number | null,
): Promise<TandaProgressRow[]> {
  await ensureDatabaseReady();

  if (startHarvestId === null) {
    return db.getAllAsync<TandaProgressRow>(
      `
        SELECT
          harvests.id AS id,
          workers.id AS workerId,
          workers.name AS workerName,
          harvests.kg AS kg,
          harvests.created_at AS createdAt
        FROM harvests
        INNER JOIN workers ON workers.id = harvests.worker_id
        ORDER BY harvests.id ASC
      `,
    );
  }

  return db.getAllAsync<TandaProgressRow>(
    `
      SELECT
        harvests.id AS id,
        workers.id AS workerId,
        workers.name AS workerName,
        harvests.kg AS kg,
        harvests.created_at AS createdAt
      FROM harvests
      INNER JOIN workers ON workers.id = harvests.worker_id
      WHERE harvests.id >= ?
      ORDER BY harvests.id ASC
    `,
    [startHarvestId],
  );
}

async function getTandaRecentResetStorage(): Promise<TandaRecentReset[]> {
  const rawValue = await getSetting(TANDA_RECENT_RESETS_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is TandaRecentReset => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        (typeof item.workerName === "string" || item.workerName === null) &&
        (typeof item.triggerKg === "number" || item.triggerKg === null) &&
        typeof item.overflowKg === "number" &&
        typeof item.overflowArrobas === "number" &&
        typeof item.targetArrobas === "number" &&
        typeof item.createdAt === "string"
      );
    });
  } catch {
    return [];
  }
}

async function setTandaRecentResetStorage(
  records: TandaRecentReset[],
): Promise<void> {
  if (records.length === 0) {
    await deleteSetting(TANDA_RECENT_RESETS_KEY);
    return;
  }

  await setSetting(TANDA_RECENT_RESETS_KEY, JSON.stringify(records));
}

async function appendTandaRecentReset(record: TandaRecentReset): Promise<void> {
  const currentRecords = await getTandaRecentResetStorage();
  const nextRecords = [record, ...currentRecords].slice(0, 20);

  await setTandaRecentResetStorage(nextRecords);
}

async function clearTandaRecentResetStorage(): Promise<void> {
  await deleteSetting(TANDA_RECENT_RESETS_KEY);
}

async function getRawTandaState() {
  const [targetArrobas, storedStartHarvestId, storedStartConsumedKg] =
    await Promise.all([
      getTandaTargetArrobas(),
      getSetting(TANDA_ACTIVE_START_HARVEST_ID_KEY),
      getSetting(TANDA_ACTIVE_START_CONSUMED_KG_KEY),
    ]);

  const startHarvestId = Number(storedStartHarvestId ?? "");
  const activeStartHarvestId = Number.isInteger(startHarvestId)
    ? startHarvestId
    : null;
  const startConsumedKg = Number(storedStartConsumedKg ?? "0");
  const activeStartConsumedKg =
    Number.isFinite(startConsumedKg) && startConsumedKg > 0
      ? Number(startConsumedKg.toFixed(4))
      : 0;
  const rows = await getTandaProgressRows(activeStartHarvestId);

  let currentKg = 0;

  for (const row of rows) {
    if (activeStartHarvestId !== null && row.id === activeStartHarvestId) {
      currentKg += Math.max(row.kg - activeStartConsumedKg, 0);
      continue;
    }

    currentKg += row.kg;
  }

  const totalKg = Number(currentKg.toFixed(4));
  const totalArrobas = totalKg / 12.5;
  const checkpointArrobas = activeStartConsumedKg / 12.5;
  const rawProgressArrobas = totalArrobas;
  const currentProgressArrobas = totalArrobas;

  return {
    targetArrobas,
    totalKg,
    totalArrobas,
    checkpointArrobas,
    rawProgressArrobas,
    currentProgressArrobas,
    activeStartHarvestId,
    activeStartConsumedKg,
    rows,
  };
}

async function setActiveTandaState(
  startHarvestId: number | null,
  consumedKg: number,
): Promise<void> {
  const normalizedConsumedKg =
    Number.isFinite(consumedKg) && consumedKg > 0
      ? Number(consumedKg.toFixed(4))
      : 0;

  if (startHarvestId === null) {
    await deleteSetting(TANDA_ACTIVE_START_HARVEST_ID_KEY);
  } else {
    await setSetting(TANDA_ACTIVE_START_HARVEST_ID_KEY, String(startHarvestId));
  }

  if (normalizedConsumedKg === 0) {
    await deleteSetting(TANDA_ACTIVE_START_CONSUMED_KG_KEY);
  } else {
    await setSetting(
      TANDA_ACTIVE_START_CONSUMED_KG_KEY,
      String(normalizedConsumedKg),
    );
  }

  await setSetting(TANDA_CHECKPOINT_ARROBAS_KEY, "0");
  await setSetting(TANDA_LAST_ALERT_CYCLE_KEY, "0");
}

async function resetActiveTandaStateToCurrentMoment(): Promise<void> {
  const latestHarvest = await getLatestHarvestRow();

  await setActiveTandaState(latestHarvest?.id ?? null, latestHarvest?.kg ?? 0);
}

async function setTandaCheckpointArrobas(value: number): Promise<void> {
  const normalizedValue =
    Number.isFinite(value) && value > 0 ? Number(value.toFixed(4)) : 0;

  await setSetting(TANDA_CHECKPOINT_ARROBAS_KEY, String(normalizedValue));
  await setSetting(TANDA_LAST_ALERT_CYCLE_KEY, "0");
}

function getRemainingTandaProgressArrobas(
  progressArrobas: number,
  targetArrobas: number,
): number {
  if (
    !Number.isFinite(progressArrobas) ||
    !Number.isFinite(targetArrobas) ||
    targetArrobas <= 0
  ) {
    return 0;
  }

  const remainder = progressArrobas % targetArrobas;

  if (
    Math.abs(remainder) < 0.0001 ||
    Math.abs(remainder - targetArrobas) < 0.0001
  ) {
    return 0;
  }

  return Number(remainder.toFixed(4));
}

async function runInTransaction<T>(callback: () => Promise<T>): Promise<T> {
  await ensureDatabaseReady();
  await db.execAsync("BEGIN IMMEDIATE TRANSACTION");

  try {
    const result = await callback();
    await db.execAsync("COMMIT");
    return result;
  } catch (error) {
    await db.execAsync("ROLLBACK");
    throw error;
  }
}

export async function getWorkers(): Promise<Worker[]> {
  await ensureDatabaseReady();

  return db.getAllAsync<Worker>("SELECT id, name FROM workers ORDER BY id ASC");
}

export async function addWorker(name: string): Promise<number> {
  await ensureDatabaseReady();

  const result = await db.runAsync("INSERT INTO workers (name) VALUES (?)", [
    name,
  ]);

  return Number(result.lastInsertRowId);
}

export async function getWorkerById(id: number): Promise<Worker | null> {
  await ensureDatabaseReady();

  const worker = await db.getFirstAsync<Worker>(
    "SELECT id, name FROM workers WHERE id = ?",
    [id],
  );

  return worker ?? null;
}

export async function addHarvest(
  workerId: number,
  kg: number,
): Promise<number> {
  await ensureDatabaseReady();

  const result = await db.runAsync(
    "INSERT INTO harvests (worker_id, kg) VALUES (?, ?)",
    [workerId, kg],
  );

  return Number(result.lastInsertRowId);
}

export async function deleteHarvest(id: number): Promise<void> {
  await ensureDatabaseReady();

  await db.runAsync("DELETE FROM harvests WHERE id = ?", [id]);
}

export async function updateHarvest(id: number, kg: number): Promise<void> {
  await ensureDatabaseReady();

  await db.runAsync("UPDATE harvests SET kg = ? WHERE id = ?", [kg, id]);
}

export async function getHarvestsByWorker(
  workerId: number,
): Promise<HarvestEntry[]> {
  await ensureDatabaseReady();

  return db.getAllAsync<HarvestEntry>(
    `
      SELECT
        id,
        kg,
        created_at AS createdAt
      FROM harvests
      WHERE worker_id = ?
      ORDER BY id ASC
    `,
    [workerId],
  );
}

export async function getWorkerTotalKg(workerId: number): Promise<number> {
  await ensureDatabaseReady();

  const result = await db.getFirstAsync<{ totalKg: number }>(
    "SELECT COALESCE(SUM(kg), 0) AS totalKg FROM harvests WHERE worker_id = ?",
    [workerId],
  );

  return result?.totalKg ?? 0;
}

export async function getWorkersWithTotalKg(): Promise<WorkerTotalKg[]> {
  await ensureDatabaseReady();

  return db.getAllAsync<WorkerTotalKg>(
    `
      SELECT
        workers.id AS id,
        workers.name AS name,
        COALESCE(SUM(harvests.kg), 0) AS totalKg
      FROM workers
      LEFT JOIN harvests ON harvests.worker_id = workers.id
      GROUP BY workers.id, workers.name
      ORDER BY workers.id ASC
    `,
  );
}

export async function getOverallTotalKg(): Promise<number> {
  await ensureDatabaseReady();

  const result = await db.getFirstAsync<{ totalKg: number }>(
    `
      SELECT COALESCE(SUM(harvests.kg), 0) AS totalKg
      FROM harvests
      INNER JOIN workers ON workers.id = harvests.worker_id
    `,
  );

  return result?.totalKg ?? 0;
}

export async function getTandaTargetArrobas(): Promise<number> {
  const value = await getSetting(TANDA_TARGET_ARROBAS_KEY);
  const parsed = Number(value ?? String(DEFAULT_TANDA_TARGET_ARROBAS));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TANDA_TARGET_ARROBAS;
  }

  return parsed;
}

export async function setTandaTargetArrobas(
  targetArrobas: number,
): Promise<void> {
  if (!Number.isFinite(targetArrobas) || targetArrobas <= 0) {
    throw new Error("INVALID_TANDA_TARGET_ARROBAS");
  }

  const normalizedTarget = Number(targetArrobas.toFixed(2));

  await setSetting(TANDA_TARGET_ARROBAS_KEY, String(normalizedTarget));
}

export async function getTandaOverview(): Promise<TandaOverview> {
  const {
    targetArrobas,
    totalKg,
    totalArrobas,
    checkpointArrobas,
    currentProgressArrobas,
  } = await getRawTandaState();
  const remainingArrobas = Math.max(targetArrobas - currentProgressArrobas, 0);

  return {
    targetArrobas,
    totalKg,
    totalArrobas,
    checkpointArrobas,
    progressArrobas: currentProgressArrobas,
    completedTandas: 0,
    nextAlertAtArrobas: targetArrobas,
    remainingArrobas,
  };
}

export async function resetTandaAlertProgress(): Promise<void> {
  await resetActiveTandaStateToCurrentMoment();
  await clearTandaRecentResetStorage();
}

export async function consumeTandaAlert(): Promise<TandaAlertEvent | null> {
  const {
    targetArrobas,
    totalArrobas,
    totalKg,
    rawProgressArrobas,
    activeStartHarvestId,
    activeStartConsumedKg,
    rows,
  } = await getRawTandaState();

  if (!Number.isFinite(targetArrobas) || targetArrobas <= 0) {
    return null;
  }

  if (rawProgressArrobas < targetArrobas) {
    return null;
  }

  const targetKg = targetArrobas * 12.5;
  let processedKg = 0;
  let remainderKg = 0;
  let triggerRow: TandaProgressRow | null = null;
  let nextConsumedKg = activeStartConsumedKg;

  for (const row of rows) {
    const baseConsumedKg =
      activeStartHarvestId !== null && row.id === activeStartHarvestId
        ? activeStartConsumedKg
        : 0;
    const availableKg = Math.max(row.kg - baseConsumedKg, 0);

    if (availableKg <= 0) {
      continue;
    }

    processedKg += availableKg;

    if (processedKg < targetKg) {
      continue;
    }

    const cycles = Math.floor(processedKg / targetKg);
    remainderKg = processedKg - cycles * targetKg;
    nextConsumedKg = Number(
      (baseConsumedKg + (availableKg - remainderKg)).toFixed(4),
    );
    triggerRow = row;
  }

  if (!triggerRow) {
    return null;
  }

  const overflowKg = Number(remainderKg.toFixed(4));
  const overflowArrobas = overflowKg / 12.5;

  await setActiveTandaState(triggerRow.id, nextConsumedKg);
  await appendTandaRecentReset({
    id: `${triggerRow.id}-${Date.now()}`,
    workerName: triggerRow.workerName,
    triggerKg: triggerRow.kg,
    overflowKg,
    overflowArrobas,
    targetArrobas,
    createdAt: triggerRow.createdAt,
  });

  return {
    milestone: 1,
    targetArrobas,
    totalArrobas,
    progressArrobas: overflowArrobas,
    overflowArrobas,
    overflowKg,
    workerName: triggerRow.workerName,
    triggerKg: triggerRow.kg,
    reachedArrobas: targetArrobas,
  };
}

export async function getTandaRecentResets(
  limit = 10,
): Promise<TandaRecentReset[]> {
  const records = await getTandaRecentResetStorage();

  return records.slice(0, limit);
}

export async function getCurrentTandaFeed(
  limit = 20,
): Promise<TandaCurrentEntry[]> {
  const { activeStartHarvestId, activeStartConsumedKg, rows } =
    await getRawTandaState();

  const entries = rows
    .map((row) => {
      const countedKg =
        activeStartHarvestId !== null && row.id === activeStartHarvestId
          ? Math.max(row.kg - activeStartConsumedKg, 0)
          : row.kg;

      return {
        id: row.id,
        workerId: row.workerId,
        workerName: row.workerName,
        kg: row.kg,
        countedKg: Number(countedKg.toFixed(4)),
        arrobas: row.kg / 12.5,
        countedArrobas: Number((countedKg / 12.5).toFixed(4)),
        createdAt: row.createdAt,
      } satisfies TandaCurrentEntry;
    })
    .filter((entry) => entry.countedKg > 0);

  return entries.slice(-limit).reverse();
}

export async function getHarvestFeed(limit = 20): Promise<HarvestFeedEntry[]> {
  await ensureDatabaseReady();

  const rows = await db.getAllAsync<HarvestFeedRow>(
    `
      SELECT
        harvests.id AS id,
        workers.id AS workerId,
        workers.name AS workerName,
        harvests.kg AS kg,
        harvests.created_at AS createdAt
      FROM harvests
      INNER JOIN workers ON workers.id = harvests.worker_id
      ORDER BY harvests.id ASC
    `,
  );

  let cumulativeKg = 0;

  const feed = rows.map((row) => {
    cumulativeKg += row.kg;

    return {
      id: row.id,
      workerId: row.workerId,
      workerName: row.workerName,
      kg: row.kg,
      arrobas: row.kg / 12.5,
      createdAt: row.createdAt,
      cumulativeKg,
      cumulativeArrobas: cumulativeKg / 12.5,
    } satisfies HarvestFeedEntry;
  });

  return feed.slice(-limit).reverse();
}

export async function getPricePerArroba(): Promise<number> {
  const value = await getSetting("price_per_arroba");
  const parsed = Number(value ?? String(DEFAULT_PRICE_PER_ARROBA));

  return Number.isFinite(parsed) ? parsed : DEFAULT_PRICE_PER_ARROBA;
}

export async function setPricePerArroba(price: number): Promise<void> {
  await setSetting("price_per_arroba", String(price));
}

export async function updateWorker(id: number, newName: string): Promise<void> {
  await ensureDatabaseReady();

  await db.runAsync("UPDATE workers SET name = ? WHERE id = ?", [newName, id]);
}

export async function deleteWorker(id: number): Promise<void> {
  await ensureDatabaseReady();

  await db.runAsync("DELETE FROM workers WHERE id = ?", [id]);
}

export async function savedHarvestNameExists(name: string): Promise<boolean> {
  await ensureDatabaseReady();

  const result = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM saved_harvests WHERE name = ? COLLATE NOCASE",
    [name.trim()],
  );

  return result !== null;
}

export async function getCurrentHarvestLabel(): Promise<string | null> {
  const value = await getSetting(CURRENT_HARVEST_LABEL_KEY);
  const trimmedValue = value?.trim() ?? "";

  return trimmedValue ? trimmedValue : null;
}

export async function clearCurrentHarvest(): Promise<void> {
  await runInTransaction(async () => {
    await db.runAsync("DELETE FROM workers");
    await setActiveTandaState(null, 0);
    await clearTandaRecentResetStorage();
    await deleteSetting(CURRENT_HARVEST_LABEL_KEY);
  });
}

export async function saveCurrentHarvest(name: string): Promise<number> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Saved harvest name is required");
  }

  return runInTransaction(async () => {
    const duplicate = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM saved_harvests WHERE name = ? COLLATE NOCASE",
      [trimmedName],
    );

    if (duplicate) {
      throw new Error("SAVED_HARVEST_NAME_EXISTS");
    }

    const pricePerArroba = await getPricePerArroba();
    const workers = await getWorkers();

    const savedHarvestResult = await db.runAsync(
      "INSERT INTO saved_harvests (name, price_per_arroba) VALUES (?, ?)",
      [trimmedName, pricePerArroba],
    );

    const savedHarvestId = Number(savedHarvestResult.lastInsertRowId);

    for (const [workerIndex, worker] of workers.entries()) {
      const savedWorkerResult = await db.runAsync(
        `
          INSERT INTO saved_workers (saved_harvest_id, name, sort_order)
          VALUES (?, ?, ?)
        `,
        [savedHarvestId, worker.name, workerIndex],
      );

      const savedWorkerId = Number(savedWorkerResult.lastInsertRowId);
      const harvests = await getHarvestsByWorker(worker.id);

      for (const [entryIndex, harvest] of harvests.entries()) {
        await db.runAsync(
          `
            INSERT INTO saved_entries (
              saved_worker_id,
              kg,
              created_at,
              sort_order
            ) VALUES (?, ?, ?, ?)
          `,
          [savedWorkerId, harvest.kg, harvest.createdAt, entryIndex],
        );
      }
    }

    return savedHarvestId;
  });
}

export async function getSavedHarvests(): Promise<SavedHarvest[]> {
  await ensureDatabaseReady();

  return db.getAllAsync<SavedHarvest>(
    `
      SELECT
        saved_harvests.id AS id,
        saved_harvests.name AS name,
        saved_harvests.created_at AS createdAt,
        saved_harvests.price_per_arroba AS pricePerArroba,
        COUNT(DISTINCT saved_workers.id) AS workerCount,
        COALESCE(SUM(saved_entries.kg), 0) AS totalKg
      FROM saved_harvests
      LEFT JOIN saved_workers
        ON saved_workers.saved_harvest_id = saved_harvests.id
      LEFT JOIN saved_entries
        ON saved_entries.saved_worker_id = saved_workers.id
      GROUP BY
        saved_harvests.id,
        saved_harvests.name,
        saved_harvests.created_at,
        saved_harvests.price_per_arroba
      ORDER BY saved_harvests.created_at DESC, saved_harvests.id DESC
    `,
  );
}

export async function getSavedHarvestPreview(
  id: number,
): Promise<SavedHarvestPreview | null> {
  await ensureDatabaseReady();

  const harvest = await db.getFirstAsync<SavedHarvest>(
    `
      SELECT
        saved_harvests.id AS id,
        saved_harvests.name AS name,
        saved_harvests.created_at AS createdAt,
        saved_harvests.price_per_arroba AS pricePerArroba,
        COUNT(DISTINCT saved_workers.id) AS workerCount,
        COALESCE(SUM(saved_entries.kg), 0) AS totalKg
      FROM saved_harvests
      LEFT JOIN saved_workers
        ON saved_workers.saved_harvest_id = saved_harvests.id
      LEFT JOIN saved_entries
        ON saved_entries.saved_worker_id = saved_workers.id
      WHERE saved_harvests.id = ?
      GROUP BY
        saved_harvests.id,
        saved_harvests.name,
        saved_harvests.created_at,
        saved_harvests.price_per_arroba
    `,
    [id],
  );

  if (!harvest) {
    return null;
  }

  const savedWorkers = await db.getAllAsync<SavedWorkerRow>(
    `
      SELECT id, name
      FROM saved_workers
      WHERE saved_harvest_id = ?
      ORDER BY sort_order ASC, id ASC
    `,
    [id],
  );

  const workers = await Promise.all(
    savedWorkers.map(async (savedWorker) => {
      const entries = await db.getAllAsync<HarvestEntry>(
        `
          SELECT
            id,
            kg,
            created_at AS createdAt
          FROM saved_entries
          WHERE saved_worker_id = ?
          ORDER BY sort_order ASC, id ASC
        `,
        [savedWorker.id],
      );

      return {
        id: savedWorker.id,
        name: savedWorker.name,
        totalKg: entries.reduce((sum, entry) => sum + entry.kg, 0),
        entries,
      } satisfies SavedHarvestWorker;
    }),
  );

  return {
    harvest,
    workers,
  };
}

export async function updateSavedHarvestPrice(
  id: number,
  pricePerArroba: number,
): Promise<void> {
  if (!Number.isFinite(pricePerArroba) || pricePerArroba <= 0) {
    throw new Error("INVALID_PRICE_PER_ARROBA");
  }

  await runInTransaction(async () => {
    const savedHarvest = await db.getFirstAsync<SavedHarvestRow>(
      `
        SELECT
          id,
          name,
          created_at AS createdAt,
          price_per_arroba AS pricePerArroba
        FROM saved_harvests
        WHERE id = ?
      `,
      [id],
    );

    if (!savedHarvest) {
      throw new Error("SAVED_HARVEST_NOT_FOUND");
    }

    await db.runAsync(
      "UPDATE saved_harvests SET price_per_arroba = ? WHERE id = ?",
      [pricePerArroba, id],
    );

    const currentHarvestLabel = await getCurrentHarvestLabel();

    if (currentHarvestLabel === savedHarvest.name) {
      await setSetting("price_per_arroba", String(pricePerArroba));
    }
  });
}

export async function loadSavedHarvest(id: number): Promise<void> {
  await runInTransaction(async () => {
    const savedHarvest = await db.getFirstAsync<SavedHarvestRow>(
      `
        SELECT
          id,
          name,
          created_at AS createdAt,
          price_per_arroba AS pricePerArroba
        FROM saved_harvests
        WHERE id = ?
      `,
      [id],
    );

    if (!savedHarvest) {
      throw new Error("SAVED_HARVEST_NOT_FOUND");
    }

    await db.runAsync("DELETE FROM workers");

    const savedWorkers = await db.getAllAsync<SavedWorkerRow>(
      `
        SELECT id, name
        FROM saved_workers
        WHERE saved_harvest_id = ?
        ORDER BY sort_order ASC, id ASC
      `,
      [id],
    );

    for (const savedWorker of savedWorkers) {
      const workerResult = await db.runAsync(
        "INSERT INTO workers (name) VALUES (?)",
        [savedWorker.name],
      );

      const newWorkerId = Number(workerResult.lastInsertRowId);
      const savedEntries = await db.getAllAsync<SavedEntryRow>(
        `
          SELECT kg, created_at AS createdAt
          FROM saved_entries
          WHERE saved_worker_id = ?
          ORDER BY sort_order ASC, id ASC
        `,
        [savedWorker.id],
      );

      for (const entry of savedEntries) {
        await db.runAsync(
          "INSERT INTO harvests (worker_id, kg, created_at) VALUES (?, ?, ?)",
          [newWorkerId, entry.kg, entry.createdAt],
        );
      }
    }

    await setSetting("price_per_arroba", String(savedHarvest.pricePerArroba));
    await setSetting(CURRENT_HARVEST_LABEL_KEY, savedHarvest.name);
    await resetActiveTandaStateToCurrentMoment();
    await clearTandaRecentResetStorage();
  });
}

export async function deleteSavedHarvest(id: number): Promise<void> {
  await ensureDatabaseReady();

  await db.runAsync("DELETE FROM saved_harvests WHERE id = ?", [id]);
}

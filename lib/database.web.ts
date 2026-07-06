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

type HarvestRow = HarvestEntry & {
  worker_id: number;
};

type SavedHarvestRow = {
  id: number;
  name: string;
  createdAt: string;
  pricePerArroba: number;
};

type SavedWorkerRow = {
  id: number;
  saved_harvest_id: number;
  name: string;
  sortOrder: number;
};

type SavedEntryRow = {
  id: number;
  saved_worker_id: number;
  kg: number;
  createdAt: string;
  sortOrder: number;
};

type HarvestFeedRow = {
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

type PersistedHarvestRow = {
  id?: number;
  worker_id?: number;
  kg?: number;
  createdAt?: string;
  created_at?: string;
};

type PersistedSavedHarvestRow = {
  id?: number;
  name?: string;
  createdAt?: string;
  created_at?: string;
  pricePerArroba?: number;
  price_per_arroba?: number;
};

type PersistedSavedWorkerRow = {
  id?: number;
  saved_harvest_id?: number;
  name?: string;
  sortOrder?: number;
  sort_order?: number;
};

type PersistedSavedEntryRow = {
  id?: number;
  saved_worker_id?: number;
  kg?: number;
  createdAt?: string;
  created_at?: string;
  sortOrder?: number;
  sort_order?: number;
};

type WebDatabaseState = {
  workers: Worker[];
  harvests: HarvestRow[];
  savedHarvests: SavedHarvestRow[];
  savedWorkers: SavedWorkerRow[];
  savedEntries: SavedEntryRow[];
  settings: Record<string, string>;
  counters: {
    worker: number;
    harvest: number;
    savedHarvest: number;
    savedWorker: number;
    savedEntry: number;
  };
};

const STORAGE_KEY = "cosechando_web_db_v2";
const DEFAULT_PRICE_PER_ARROBA = 9000;
const DEFAULT_TANDA_TARGET_ARROBAS = 35;
const CURRENT_HARVEST_LABEL_KEY = "current_harvest_label";
const TANDA_TARGET_ARROBAS_KEY = "tanda_target_arrobas";
const TANDA_CHECKPOINT_ARROBAS_KEY = "tanda_checkpoint_arrobas";
const TANDA_LAST_ALERT_CYCLE_KEY = "tanda_last_alert_cycle";
const TANDA_RECENT_RESETS_KEY = "tanda_recent_resets";
const TANDA_ACTIVE_START_HARVEST_ID_KEY = "tanda_active_start_harvest_id";
const TANDA_ACTIVE_START_CONSUMED_KG_KEY = "tanda_active_start_consumed_kg";

let serverState: WebDatabaseState | null = null;

function createInitialState(): WebDatabaseState {
  return {
    workers: [],
    harvests: [],
    savedHarvests: [],
    savedWorkers: [],
    savedEntries: [],
    settings: {
      price_per_arroba: String(DEFAULT_PRICE_PER_ARROBA),
      [TANDA_TARGET_ARROBAS_KEY]: String(DEFAULT_TANDA_TARGET_ARROBAS),
      [TANDA_CHECKPOINT_ARROBAS_KEY]: "0",
      [TANDA_LAST_ALERT_CYCLE_KEY]: "0",
      [TANDA_ACTIVE_START_HARVEST_ID_KEY]: "",
      [TANDA_ACTIVE_START_CONSUMED_KG_KEY]: "0",
    },
    counters: {
      worker: 0,
      harvest: 0,
      savedHarvest: 0,
      savedWorker: 0,
      savedEntry: 0,
    },
  };
}

function parseState(raw: string | null): WebDatabaseState {
  if (!raw) {
    return createInitialState();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WebDatabaseState>;

    const workers = Array.isArray(parsed.workers)
      ? parsed.workers.filter(
          (item): item is Worker =>
            typeof item?.id === "number" && typeof item?.name === "string",
        )
      : [];

    const harvests = Array.isArray(parsed.harvests)
      ? parsed.harvests.reduce<HarvestRow[]>((acc, item) => {
          const harvest = item as PersistedHarvestRow;
          const createdAt =
            typeof harvest?.createdAt === "string"
              ? harvest.createdAt
              : typeof harvest?.created_at === "string"
                ? harvest.created_at
                : null;

          if (
            typeof harvest?.id === "number" &&
            typeof harvest?.worker_id === "number" &&
            typeof harvest?.kg === "number" &&
            createdAt
          ) {
            acc.push({
              id: harvest.id,
              worker_id: harvest.worker_id,
              kg: harvest.kg,
              createdAt,
            });
          }

          return acc;
        }, [])
      : [];

    const savedHarvests = Array.isArray(parsed.savedHarvests)
      ? parsed.savedHarvests.reduce<SavedHarvestRow[]>((acc, item) => {
          const savedHarvest = item as PersistedSavedHarvestRow;
          const createdAt =
            typeof savedHarvest?.createdAt === "string"
              ? savedHarvest.createdAt
              : typeof savedHarvest?.created_at === "string"
                ? savedHarvest.created_at
                : null;
          const pricePerArroba =
            typeof savedHarvest?.pricePerArroba === "number"
              ? savedHarvest.pricePerArroba
              : typeof savedHarvest?.price_per_arroba === "number"
                ? savedHarvest.price_per_arroba
                : null;

          if (
            typeof savedHarvest?.id === "number" &&
            typeof savedHarvest?.name === "string" &&
            createdAt &&
            typeof pricePerArroba === "number"
          ) {
            acc.push({
              id: savedHarvest.id,
              name: savedHarvest.name,
              createdAt,
              pricePerArroba,
            });
          }

          return acc;
        }, [])
      : [];

    const savedWorkers = Array.isArray(parsed.savedWorkers)
      ? parsed.savedWorkers.reduce<SavedWorkerRow[]>((acc, item) => {
          const savedWorker = item as PersistedSavedWorkerRow;
          const sortOrder =
            typeof savedWorker?.sortOrder === "number"
              ? savedWorker.sortOrder
              : typeof savedWorker?.sort_order === "number"
                ? savedWorker.sort_order
                : null;

          if (
            typeof savedWorker?.id === "number" &&
            typeof savedWorker?.saved_harvest_id === "number" &&
            typeof savedWorker?.name === "string" &&
            typeof sortOrder === "number"
          ) {
            acc.push({
              id: savedWorker.id,
              saved_harvest_id: savedWorker.saved_harvest_id,
              name: savedWorker.name,
              sortOrder,
            });
          }

          return acc;
        }, [])
      : [];

    const savedEntries = Array.isArray(parsed.savedEntries)
      ? parsed.savedEntries.reduce<SavedEntryRow[]>((acc, item) => {
          const savedEntry = item as PersistedSavedEntryRow;
          const createdAt =
            typeof savedEntry?.createdAt === "string"
              ? savedEntry.createdAt
              : typeof savedEntry?.created_at === "string"
                ? savedEntry.created_at
                : null;
          const sortOrder =
            typeof savedEntry?.sortOrder === "number"
              ? savedEntry.sortOrder
              : typeof savedEntry?.sort_order === "number"
                ? savedEntry.sort_order
                : null;

          if (
            typeof savedEntry?.id === "number" &&
            typeof savedEntry?.saved_worker_id === "number" &&
            typeof savedEntry?.kg === "number" &&
            createdAt &&
            typeof sortOrder === "number"
          ) {
            acc.push({
              id: savedEntry.id,
              saved_worker_id: savedEntry.saved_worker_id,
              kg: savedEntry.kg,
              createdAt,
              sortOrder,
            });
          }

          return acc;
        }, [])
      : [];

    const settings =
      parsed.settings && typeof parsed.settings === "object"
        ? Object.entries(parsed.settings).reduce<Record<string, string>>(
            (acc, [key, value]) => {
              if (typeof value === "string") {
                acc[key] = value;
              }

              return acc;
            },
            {},
          )
        : {};

    const counters = parsed.counters;

    return {
      workers,
      harvests,
      savedHarvests,
      savedWorkers,
      savedEntries,
      settings: {
        price_per_arroba:
          settings.price_per_arroba ?? String(DEFAULT_PRICE_PER_ARROBA),
        [TANDA_TARGET_ARROBAS_KEY]:
          settings[TANDA_TARGET_ARROBAS_KEY] ??
          String(DEFAULT_TANDA_TARGET_ARROBAS),
        [TANDA_CHECKPOINT_ARROBAS_KEY]:
          settings[TANDA_CHECKPOINT_ARROBAS_KEY] ?? "0",
        [TANDA_LAST_ALERT_CYCLE_KEY]:
          settings[TANDA_LAST_ALERT_CYCLE_KEY] ?? "0",
        [TANDA_ACTIVE_START_HARVEST_ID_KEY]:
          settings[TANDA_ACTIVE_START_HARVEST_ID_KEY] ?? "",
        [TANDA_ACTIVE_START_CONSUMED_KG_KEY]:
          settings[TANDA_ACTIVE_START_CONSUMED_KG_KEY] ?? "0",
        ...settings,
      },
      counters: {
        worker: Math.max(
          typeof counters?.worker === "number" ? counters.worker : 0,
          workers.reduce((max, worker) => Math.max(max, worker.id), 0),
        ),
        harvest: Math.max(
          typeof counters?.harvest === "number" ? counters.harvest : 0,
          harvests.reduce((max, harvest) => Math.max(max, harvest.id), 0),
        ),
        savedHarvest: Math.max(
          typeof counters?.savedHarvest === "number"
            ? counters.savedHarvest
            : 0,
          savedHarvests.reduce(
            (max, savedHarvest) => Math.max(max, savedHarvest.id),
            0,
          ),
        ),
        savedWorker: Math.max(
          typeof counters?.savedWorker === "number" ? counters.savedWorker : 0,
          savedWorkers.reduce(
            (max, savedWorker) => Math.max(max, savedWorker.id),
            0,
          ),
        ),
        savedEntry: Math.max(
          typeof counters?.savedEntry === "number" ? counters.savedEntry : 0,
          savedEntries.reduce(
            (max, savedEntry) => Math.max(max, savedEntry.id),
            0,
          ),
        ),
      },
    };
  } catch {
    return createInitialState();
  }
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readState(): WebDatabaseState {
  const storage = getStorage();

  if (!storage) {
    if (!serverState) {
      serverState = createInitialState();
    }

    return serverState;
  }

  const state = parseState(storage.getItem(STORAGE_KEY));
  storage.setItem(STORAGE_KEY, JSON.stringify(state));

  return state;
}

function writeState(state: WebDatabaseState) {
  const storage = getStorage();

  if (!storage) {
    serverState = state;
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getSetting(state: WebDatabaseState, key: string): string | null {
  const value = state.settings[key];

  return typeof value === "string" ? value : null;
}

function setSetting(state: WebDatabaseState, key: string, value: string) {
  state.settings[key] = value;
}

function deleteSetting(state: WebDatabaseState, key: string) {
  delete state.settings[key];
}

function getTandaRecentResetStorage(
  state: WebDatabaseState,
): TandaRecentReset[] {
  const rawValue = getSetting(state, TANDA_RECENT_RESETS_KEY);

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

function setTandaRecentResetStorage(
  state: WebDatabaseState,
  records: TandaRecentReset[],
) {
  if (records.length === 0) {
    deleteSetting(state, TANDA_RECENT_RESETS_KEY);
    return;
  }

  setSetting(state, TANDA_RECENT_RESETS_KEY, JSON.stringify(records));
}

function appendTandaRecentReset(
  state: WebDatabaseState,
  record: TandaRecentReset,
) {
  const nextRecords = [record, ...getTandaRecentResetStorage(state)].slice(
    0,
    20,
  );

  setTandaRecentResetStorage(state, nextRecords);
}

function clearTandaRecentResetStorage(state: WebDatabaseState) {
  deleteSetting(state, TANDA_RECENT_RESETS_KEY);
}

async function getRawTandaState() {
  const state = readState();
  const targetArrobas = await getTandaTargetArrobas();
  const startHarvestIdValue = Number(
    getSetting(state, TANDA_ACTIVE_START_HARVEST_ID_KEY) ?? "",
  );
  const activeStartHarvestId = Number.isInteger(startHarvestIdValue)
    ? startHarvestIdValue
    : null;
  const startConsumedKgValue = Number(
    getSetting(state, TANDA_ACTIVE_START_CONSUMED_KG_KEY) ?? "0",
  );
  const activeStartConsumedKg =
    Number.isFinite(startConsumedKgValue) && startConsumedKgValue > 0
      ? Number(startConsumedKgValue.toFixed(4))
      : 0;
  const workersById = new Map(
    state.workers.map((worker) => [worker.id, worker.name]),
  );
  const rows = state.harvests
    .filter(
      (harvest) =>
        workersById.has(harvest.worker_id) &&
        (activeStartHarvestId === null || harvest.id >= activeStartHarvestId),
    )
    .sort((a, b) => a.id - b.id)
    .map(
      (harvest) =>
        ({
          id: harvest.id,
          workerId: harvest.worker_id,
          workerName: workersById.get(harvest.worker_id) ?? "Sin nombre",
          kg: harvest.kg,
          createdAt: harvest.createdAt,
        }) satisfies TandaProgressRow,
    );

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
    state,
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

function setActiveTandaState(
  state: WebDatabaseState,
  startHarvestId: number | null,
  consumedKg: number,
) {
  const normalizedConsumedKg =
    Number.isFinite(consumedKg) && consumedKg > 0
      ? Number(consumedKg.toFixed(4))
      : 0;

  if (startHarvestId === null) {
    deleteSetting(state, TANDA_ACTIVE_START_HARVEST_ID_KEY);
  } else {
    setSetting(
      state,
      TANDA_ACTIVE_START_HARVEST_ID_KEY,
      String(startHarvestId),
    );
  }

  if (normalizedConsumedKg === 0) {
    deleteSetting(state, TANDA_ACTIVE_START_CONSUMED_KG_KEY);
  } else {
    setSetting(
      state,
      TANDA_ACTIVE_START_CONSUMED_KG_KEY,
      String(normalizedConsumedKg),
    );
  }

  setSetting(state, TANDA_CHECKPOINT_ARROBAS_KEY, "0");
  setSetting(state, TANDA_LAST_ALERT_CYCLE_KEY, "0");
}

function resetActiveTandaStateToCurrentMoment(state: WebDatabaseState) {
  const latestHarvest = [...state.harvests]
    .filter((harvest) =>
      state.workers.some((worker) => worker.id === harvest.worker_id),
    )
    .sort((a, b) => b.id - a.id)[0];

  setActiveTandaState(state, latestHarvest?.id ?? null, latestHarvest?.kg ?? 0);
}

function setTandaCheckpointArrobas(state: WebDatabaseState, value: number) {
  const normalizedValue =
    Number.isFinite(value) && value > 0 ? Number(value.toFixed(4)) : 0;

  setSetting(state, TANDA_CHECKPOINT_ARROBAS_KEY, String(normalizedValue));
  setSetting(state, TANDA_LAST_ALERT_CYCLE_KEY, "0");
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

export async function getWorkers(): Promise<Worker[]> {
  const state = readState();

  return [...state.workers].sort((a, b) => a.id - b.id);
}

export async function addWorker(name: string): Promise<number> {
  const state = readState();
  const id = state.counters.worker + 1;

  state.counters.worker = id;
  state.workers.push({ id, name });
  writeState(state);

  return id;
}

export async function getWorkerById(id: number): Promise<Worker | null> {
  const state = readState();

  return state.workers.find((worker) => worker.id === id) ?? null;
}

export async function addHarvest(
  workerId: number,
  kg: number,
): Promise<number> {
  const state = readState();
  const id = state.counters.harvest + 1;

  state.counters.harvest = id;
  state.harvests.push({
    id,
    worker_id: workerId,
    kg,
    createdAt: new Date().toISOString(),
  });
  writeState(state);

  return id;
}

export async function deleteHarvest(id: number): Promise<void> {
  const state = readState();

  state.harvests = state.harvests.filter((harvest) => harvest.id !== id);
  writeState(state);
}

export async function updateHarvest(id: number, kg: number): Promise<void> {
  const state = readState();
  const harvest = state.harvests.find((item) => item.id === id);

  if (!harvest) {
    return;
  }

  harvest.kg = kg;
  writeState(state);
}

export async function getHarvestsByWorker(
  workerId: number,
): Promise<HarvestEntry[]> {
  const state = readState();

  return state.harvests
    .filter((harvest) => harvest.worker_id === workerId)
    .sort((a, b) => a.id - b.id)
    .map((harvest) => ({
      id: harvest.id,
      kg: harvest.kg,
      createdAt: harvest.createdAt,
    }));
}

export async function getWorkerTotalKg(workerId: number): Promise<number> {
  const state = readState();

  return state.harvests
    .filter((harvest) => harvest.worker_id === workerId)
    .reduce((sum, harvest) => sum + harvest.kg, 0);
}

export async function getWorkersWithTotalKg(): Promise<WorkerTotalKg[]> {
  const state = readState();

  return [...state.workers]
    .sort((a, b) => a.id - b.id)
    .map((worker) => ({
      id: worker.id,
      name: worker.name,
      totalKg: state.harvests
        .filter((harvest) => harvest.worker_id === worker.id)
        .reduce((sum, harvest) => sum + harvest.kg, 0),
    }));
}

export async function getOverallTotalKg(): Promise<number> {
  const state = readState();
  const workerIds = new Set(state.workers.map((worker) => worker.id));

  return state.harvests
    .filter((harvest) => workerIds.has(harvest.worker_id))
    .reduce((sum, harvest) => sum + harvest.kg, 0);
}

export async function getTandaTargetArrobas(): Promise<number> {
  const state = readState();
  const parsed = Number(
    getSetting(state, TANDA_TARGET_ARROBAS_KEY) ??
      String(DEFAULT_TANDA_TARGET_ARROBAS),
  );

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

  const state = readState();
  const normalizedTarget = Number(targetArrobas.toFixed(2));

  setSetting(state, TANDA_TARGET_ARROBAS_KEY, String(normalizedTarget));
  writeState(state);
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
  const { state } = await getRawTandaState();

  resetActiveTandaStateToCurrentMoment(state);
  clearTandaRecentResetStorage(state);
  writeState(state);
}

export async function consumeTandaAlert(): Promise<TandaAlertEvent | null> {
  const {
    state,
    targetArrobas,
    totalArrobas,
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

  setActiveTandaState(state, triggerRow.id, nextConsumedKg);
  appendTandaRecentReset(state, {
    id: `${triggerRow.id}-${Date.now()}`,
    workerName: triggerRow.workerName,
    triggerKg: triggerRow.kg,
    overflowKg,
    overflowArrobas,
    targetArrobas,
    createdAt: triggerRow.createdAt,
  });
  writeState(state);

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
  const state = readState();

  return getTandaRecentResetStorage(state).slice(0, limit);
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
  const state = readState();
  const workersById = new Map(
    state.workers.map((worker) => [worker.id, worker.name]),
  );
  const rows = state.harvests
    .filter((harvest) => workersById.has(harvest.worker_id))
    .sort((a, b) => a.id - b.id)
    .map(
      (harvest) =>
        ({
          id: harvest.id,
          workerId: harvest.worker_id,
          workerName: workersById.get(harvest.worker_id) ?? "Sin nombre",
          kg: harvest.kg,
          createdAt: harvest.createdAt,
        }) satisfies HarvestFeedRow,
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
  const state = readState();
  const parsed = Number(
    getSetting(state, "price_per_arroba") ?? String(DEFAULT_PRICE_PER_ARROBA),
  );

  return Number.isFinite(parsed) ? parsed : DEFAULT_PRICE_PER_ARROBA;
}

export async function setPricePerArroba(price: number): Promise<void> {
  const state = readState();

  setSetting(state, "price_per_arroba", String(price));
  writeState(state);
}

export async function updateWorker(id: number, newName: string): Promise<void> {
  const state = readState();
  const worker = state.workers.find((item) => item.id === id);

  if (!worker) {
    return;
  }

  worker.name = newName;
  writeState(state);
}

export async function deleteWorker(id: number): Promise<void> {
  const state = readState();

  state.workers = state.workers.filter((worker) => worker.id !== id);
  state.harvests = state.harvests.filter((harvest) => harvest.worker_id !== id);
  writeState(state);
}

export async function savedHarvestNameExists(name: string): Promise<boolean> {
  const state = readState();
  const normalizedName = name.trim().toLocaleLowerCase("es-CO");

  return state.savedHarvests.some(
    (savedHarvest) =>
      savedHarvest.name.trim().toLocaleLowerCase("es-CO") === normalizedName,
  );
}

export async function getCurrentHarvestLabel(): Promise<string | null> {
  const state = readState();
  const value = getSetting(state, CURRENT_HARVEST_LABEL_KEY)?.trim() ?? "";

  return value ? value : null;
}

export async function clearCurrentHarvest(): Promise<void> {
  const state = readState();

  state.workers = [];
  state.harvests = [];
  setActiveTandaState(state, null, 0);
  clearTandaRecentResetStorage(state);
  deleteSetting(state, CURRENT_HARVEST_LABEL_KEY);
  writeState(state);
}

export async function saveCurrentHarvest(name: string): Promise<number> {
  const state = readState();
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Saved harvest name is required");
  }

  const duplicate = await savedHarvestNameExists(trimmedName);

  if (duplicate) {
    throw new Error("SAVED_HARVEST_NAME_EXISTS");
  }

  const savedHarvestId = state.counters.savedHarvest + 1;
  const pricePerArroba = await getPricePerArroba();

  state.counters.savedHarvest = savedHarvestId;
  state.savedHarvests.push({
    id: savedHarvestId,
    name: trimmedName,
    createdAt: new Date().toISOString(),
    pricePerArroba,
  });

  const workers = [...state.workers].sort((a, b) => a.id - b.id);

  for (const [workerIndex, worker] of workers.entries()) {
    const savedWorkerId = state.counters.savedWorker + 1;

    state.counters.savedWorker = savedWorkerId;
    state.savedWorkers.push({
      id: savedWorkerId,
      saved_harvest_id: savedHarvestId,
      name: worker.name,
      sortOrder: workerIndex,
    });

    const harvests = state.harvests
      .filter((harvest) => harvest.worker_id === worker.id)
      .sort((a, b) => a.id - b.id);

    for (const [entryIndex, harvest] of harvests.entries()) {
      const savedEntryId = state.counters.savedEntry + 1;

      state.counters.savedEntry = savedEntryId;
      state.savedEntries.push({
        id: savedEntryId,
        saved_worker_id: savedWorkerId,
        kg: harvest.kg,
        createdAt: harvest.createdAt,
        sortOrder: entryIndex,
      });
    }
  }

  writeState(state);

  return savedHarvestId;
}

export async function getSavedHarvests(): Promise<SavedHarvest[]> {
  const state = readState();

  return [...state.savedHarvests]
    .map((savedHarvest) => {
      const savedWorkers = state.savedWorkers.filter(
        (savedWorker) => savedWorker.saved_harvest_id === savedHarvest.id,
      );
      const savedWorkerIds = new Set(
        savedWorkers.map((savedWorker) => savedWorker.id),
      );
      const totalKg = state.savedEntries
        .filter((savedEntry) => savedWorkerIds.has(savedEntry.saved_worker_id))
        .reduce((sum, savedEntry) => sum + savedEntry.kg, 0);

      return {
        id: savedHarvest.id,
        name: savedHarvest.name,
        createdAt: savedHarvest.createdAt,
        pricePerArroba: savedHarvest.pricePerArroba,
        workerCount: savedWorkers.length,
        totalKg,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
}

export async function getSavedHarvestPreview(
  id: number,
): Promise<SavedHarvestPreview | null> {
  const state = readState();
  const harvests = await getSavedHarvests();
  const harvest = harvests.find((item) => item.id === id);

  if (!harvest) {
    return null;
  }

  const workers = state.savedWorkers
    .filter((savedWorker) => savedWorker.saved_harvest_id === id)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map((savedWorker) => {
      const entries = state.savedEntries
        .filter((savedEntry) => savedEntry.saved_worker_id === savedWorker.id)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
        .map((savedEntry) => ({
          id: savedEntry.id,
          kg: savedEntry.kg,
          createdAt: savedEntry.createdAt,
        }));

      return {
        id: savedWorker.id,
        name: savedWorker.name,
        totalKg: entries.reduce((sum, entry) => sum + entry.kg, 0),
        entries,
      } satisfies SavedHarvestWorker;
    });

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

  const state = readState();
  const savedHarvest = state.savedHarvests.find((item) => item.id === id);

  if (!savedHarvest) {
    throw new Error("SAVED_HARVEST_NOT_FOUND");
  }

  savedHarvest.pricePerArroba = pricePerArroba;

  const currentHarvestLabel = getSetting(state, CURRENT_HARVEST_LABEL_KEY);

  if (currentHarvestLabel === savedHarvest.name) {
    setSetting(state, "price_per_arroba", String(pricePerArroba));
  }

  writeState(state);
}

export async function loadSavedHarvest(id: number): Promise<void> {
  const state = readState();
  const savedHarvest = state.savedHarvests.find((item) => item.id === id);

  if (!savedHarvest) {
    throw new Error("SAVED_HARVEST_NOT_FOUND");
  }

  state.workers = [];
  state.harvests = [];

  const savedWorkers = state.savedWorkers
    .filter((savedWorker) => savedWorker.saved_harvest_id === id)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

  for (const savedWorker of savedWorkers) {
    const workerId = state.counters.worker + 1;

    state.counters.worker = workerId;
    state.workers.push({
      id: workerId,
      name: savedWorker.name,
    });

    const savedEntries = state.savedEntries
      .filter((savedEntry) => savedEntry.saved_worker_id === savedWorker.id)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

    for (const savedEntry of savedEntries) {
      const harvestId = state.counters.harvest + 1;

      state.counters.harvest = harvestId;
      state.harvests.push({
        id: harvestId,
        worker_id: workerId,
        kg: savedEntry.kg,
        createdAt: savedEntry.createdAt,
      });
    }
  }

  setSetting(state, "price_per_arroba", String(savedHarvest.pricePerArroba));
  setSetting(state, CURRENT_HARVEST_LABEL_KEY, savedHarvest.name);
  resetActiveTandaStateToCurrentMoment(state);
  clearTandaRecentResetStorage(state);
  writeState(state);
}

export async function deleteSavedHarvest(id: number): Promise<void> {
  const state = readState();
  const savedWorkerIds = new Set(
    state.savedWorkers
      .filter((savedWorker) => savedWorker.saved_harvest_id === id)
      .map((savedWorker) => savedWorker.id),
  );

  state.savedHarvests = state.savedHarvests.filter(
    (savedHarvest) => savedHarvest.id !== id,
  );
  state.savedWorkers = state.savedWorkers.filter(
    (savedWorker) => savedWorker.saved_harvest_id !== id,
  );
  state.savedEntries = state.savedEntries.filter(
    (savedEntry) => !savedWorkerIds.has(savedEntry.saved_worker_id),
  );
  writeState(state);
}

/**
 * Opportunity Map — pure, client-safe model.
 *
 * The map plots *real captured records* only. Rows are an organizational
 * dimension (organization unit or business function), columns are strategic
 * value themes. Each cell reports how many records sit there and an
 * interpretable value indicator derived from the record's own lifecycle status
 * and urgency — never an invented metric.
 *
 * No transport, no secrets, no Enterprise overlays (those are feature-flagged
 * and deliberately not computed here).
 */

export type MapRecord = {
  id: string;
  title: string;
  status: string;
  urgency: string;
  ownerName: string;
  orgUnitId: string | null;
  orgUnitName: string | null;
  businessFunction: string;
  strategicThemeId: string | null;
  strategicThemeName: string | null;
  convertedUseCaseId: string | null;
  updatedAt: string;
};

export type RowAxis = "orgUnit" | "businessFunction";

export const ROW_AXIS_LABELS: Record<RowAxis, string> = {
  orgUnit: "Organization unit",
  businessFunction: "Business function",
};

export const UNASSIGNED = "__unassigned__";
export const UNASSIGNED_LABEL = "Not classified";

/* ------------------------------------------------------------- intensity */

/**
 * Lifecycle weight — how much a record has been validated.
 * Archived records contribute nothing; they stay visible in drill-down.
 */
export const STATUS_WEIGHTS: Record<string, number> = {
  signal: 0.5,
  opportunity: 1,
  qualified: 1.5,
  converted: 2,
  deferred: 0.5,
  archived: 0,
};

/** Urgency weight — how soon the business wants the outcome. */
export const URGENCY_WEIGHTS: Record<string, number> = {
  now: 3,
  next: 2,
  later: 1,
  unknown: 1,
};

export function recordWeight(record: MapRecord): number {
  const status = STATUS_WEIGHTS[record.status] ?? 1;
  const urgency = URGENCY_WEIGHTS[record.urgency] ?? 1;
  return status * urgency;
}

export const INTENSITY_EXPLANATION =
  "Cell value = sum over the records in the cell of (lifecycle weight x urgency weight). " +
  "Lifecycle: signal 0.5, opportunity 1, qualified 1.5, converted 2, deferred 0.5, archived 0. " +
  "Urgency: now 3, next 2, later 1, not decided 1. Shading compares each cell to the highest " +
  "cell currently in view, so it always reconciles with the records listed in the drill-down.";

export type IntensityBand = "none" | "low" | "moderate" | "high" | "highest";

export function intensityBand(share: number): IntensityBand {
  if (share <= 0) return "none";
  if (share < 0.25) return "low";
  if (share < 0.5) return "moderate";
  if (share < 0.75) return "high";
  return "highest";
}

export const INTENSITY_BAND_LABELS: Record<IntensityBand, string> = {
  none: "No weighted value",
  low: "Low",
  moderate: "Moderate",
  high: "High",
  highest: "Highest",
};

/* ---------------------------------------------------------------- filters */

export type MapFilters = {
  orgUnitIds: string[];
  businessFunctions: string[];
  themeIds: string[];
  statuses: string[];
  urgencies: string[];
  owners: string[];
  search: string;
};

export function emptyMapFilters(): MapFilters {
  return {
    orgUnitIds: [],
    businessFunctions: [],
    themeIds: [],
    statuses: [],
    urgencies: [],
    owners: [],
    search: "",
  };
}

const keyOf = (value: string | null | undefined) => (value && value.trim() ? value : UNASSIGNED);

export function applyMapFilters(records: MapRecord[], filters: MapFilters): MapRecord[] {
  const term = filters.search.trim().toLowerCase();
  return records.filter((record) => {
    if (filters.orgUnitIds.length && !filters.orgUnitIds.includes(keyOf(record.orgUnitId)))
      return false;
    if (
      filters.businessFunctions.length &&
      !filters.businessFunctions.includes(keyOf(record.businessFunction))
    )
      return false;
    if (filters.themeIds.length && !filters.themeIds.includes(keyOf(record.strategicThemeId)))
      return false;
    if (filters.statuses.length && !filters.statuses.includes(record.status)) return false;
    if (filters.urgencies.length && !filters.urgencies.includes(record.urgency)) return false;
    if (filters.owners.length && !filters.owners.includes(keyOf(record.ownerName))) return false;
    if (term && !record.title.toLowerCase().includes(term)) return false;
    return true;
  });
}

export function activeFilterCount(filters: MapFilters): number {
  return (
    filters.orgUnitIds.length +
    filters.businessFunctions.length +
    filters.themeIds.length +
    filters.statuses.length +
    filters.urgencies.length +
    filters.owners.length +
    (filters.search.trim() ? 1 : 0)
  );
}

/* ----------------------------------------------------------------- matrix */

export type MapAxisValue = { key: string; label: string };

export type MapCell = {
  rowKey: string;
  columnKey: string;
  records: MapRecord[];
  count: number;
  /** Records already converted into a Studio use case. */
  convertedCount: number;
  value: number;
  share: number;
  band: IntensityBand;
};

export type MapMatrix = {
  rows: MapAxisValue[];
  columns: MapAxisValue[];
  cells: Map<string, MapCell>;
  maxValue: number;
  totalRecords: number;
  totalValue: number;
};

export const cellId = (rowKey: string, columnKey: string) => `${rowKey}::${columnKey}`;

function axisFor(record: MapRecord, axis: RowAxis): MapAxisValue {
  if (axis === "orgUnit") {
    return {
      key: keyOf(record.orgUnitId),
      label: record.orgUnitName?.trim() || UNASSIGNED_LABEL,
    };
  }
  return {
    key: keyOf(record.businessFunction),
    label: record.businessFunction.trim() || UNASSIGNED_LABEL,
  };
}

function sortAxis(values: Map<string, string>): MapAxisValue[] {
  return [...values.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => {
      if (a.key === UNASSIGNED) return 1;
      if (b.key === UNASSIGNED) return -1;
      return a.label.localeCompare(b.label);
    });
}

/** Builds the grid from the records currently in view. Pure and deterministic. */
export function buildMatrix(records: MapRecord[], axis: RowAxis): MapMatrix {
  const rowLabels = new Map<string, string>();
  const columnLabels = new Map<string, string>();
  const cells = new Map<string, MapCell>();

  for (const record of records) {
    const row = axisFor(record, axis);
    const column = {
      key: keyOf(record.strategicThemeId),
      label: record.strategicThemeName?.trim() || UNASSIGNED_LABEL,
    };
    rowLabels.set(row.key, row.label);
    columnLabels.set(column.key, column.label);

    const id = cellId(row.key, column.key);
    const cell = cells.get(id) ?? {
      rowKey: row.key,
      columnKey: column.key,
      records: [],
      count: 0,
      convertedCount: 0,
      value: 0,
      share: 0,
      band: "none" as IntensityBand,
    };
    cell.records.push(record);
    cell.count += 1;
    if (record.convertedUseCaseId) cell.convertedCount += 1;
    cell.value += recordWeight(record);
    cells.set(id, cell);
  }

  let maxValue = 0;
  let totalValue = 0;
  for (const cell of cells.values()) {
    maxValue = Math.max(maxValue, cell.value);
    totalValue += cell.value;
  }
  for (const cell of cells.values()) {
    cell.share = maxValue > 0 ? cell.value / maxValue : 0;
    cell.band = intensityBand(cell.share);
  }

  return {
    rows: sortAxis(rowLabels),
    columns: sortAxis(columnLabels),
    cells,
    maxValue,
    totalRecords: records.length,
    totalValue,
  };
}

export function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Setup readiness. The map is only meaningful once records carry an
 * organizational dimension and a strategic theme.
 */
export type MapReadiness = {
  hasRecords: boolean;
  classifiedRows: number;
  classifiedColumns: number;
  ready: boolean;
};

export function assessReadiness(records: MapRecord[], axis: RowAxis): MapReadiness {
  const rows = new Set<string>();
  const columns = new Set<string>();
  for (const record of records) {
    const rowKey = axisFor(record, axis).key;
    if (rowKey !== UNASSIGNED) rows.add(rowKey);
    if (keyOf(record.strategicThemeId) !== UNASSIGNED) columns.add(keyOf(record.strategicThemeId));
  }
  return {
    hasRecords: records.length > 0,
    classifiedRows: rows.size,
    classifiedColumns: columns.size,
    ready: records.length > 0 && rows.size > 0 && columns.size > 0,
  };
}

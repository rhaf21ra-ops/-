import { BRANCHES as STATIC_BRANCHES } from "./branches-data";

// In real mode the list comes from the database (ids are uuids). Until then the bundled list is used.
let BRANCHES: BranchRecord[] = STATIC_BRANCHES as BranchRecord[];
export function setBranches(list: BranchRecord[]) {
  if (list.length) BRANCHES = list;
}
export function getBranches(): BranchRecord[] { return BRANCHES; }

/** One row of branches-regions.csv. `id` is stable and is the value we store with an order. */
export type BranchRecord = {
  id: string;
  region: string;
  name: string;
  is_active: boolean;
};

/** Regions in the order they first appear in the CSV (عدن، تعز، صنعاء). */
export function getBranchRegions(): string[] { return Array.from(new Set(BRANCHES.map((b) => b.region))); }
/** @deprecated use getBranchRegions(); kept for the static default */
export const BRANCH_REGIONS: string[] = Array.from(new Set(STATIC_BRANCHES.map((b) => b.region)));

/** Active branches of one region only. Branches are never shown outside the chosen region. */
export function branchesInRegion(region: string): BranchRecord[] {
  return BRANCHES.filter((b) => b.is_active && b.region === region);
}

export function findBranch(id: string): BranchRecord | undefined {
  return BRANCHES.find((b) => b.id === id && b.is_active);
}

/** A branch is valid for a region only if it belongs to that region. Used on submit, not just in the UI. */
export function isBranchInRegion(branchId: string, region: string): boolean {
  return branchesInRegion(region).some((b) => b.id === branchId);
}

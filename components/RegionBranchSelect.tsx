"use client";

import { MapPin } from "lucide-react";
import { getBranchRegions, branchesInRegion } from "@/lib/branches";

/**
 * Region first, then only that region's branches. Both values are required before an installment
 * order can be sent (validated again in the checkout submit handler).
 */
export function RegionBranchSelect({
  region, onRegionChange, branchId, onBranchChange, disabled,
}: {
  region: string;
  onRegionChange: (region: string) => void;
  branchId: string;
  onBranchChange: (branchId: string) => void;
  disabled?: boolean;
}) {
  const branches = region ? branchesInRegion(region) : [];

  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <legend className="mb-2 flex items-center gap-2 font-bold">
        <MapPin className="h-5 w-5 text-primary" /> منطقة الفرع وفرع التمويل *
      </legend>

      <div>
        <p className="mb-2 text-sm text-muted-foreground">1. اختر المنطقة</p>
        <div className="flex flex-wrap gap-2">
          {getBranchRegions().map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => { onRegionChange(r); onBranchChange(""); }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                region === r ? "bg-primary text-primary-foreground" : "border bg-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {region && (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">2. اختر الفرع في منطقة {region} ({branches.length} فرعاً)</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {branches.map((b) => (
              <label
                key={b.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                  branchId === b.id ? "border-primary bg-primary/5" : "border-neutral-200 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="finance-branch"
                  className="h-4 w-4"
                  checked={branchId === b.id}
                  onChange={() => onBranchChange(b.id)}
                />
                <span className="text-sm font-medium">{b.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </fieldset>
  );
}

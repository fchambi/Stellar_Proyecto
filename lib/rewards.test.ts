import { describe, expect, it } from "vitest";
import { campaignTotals, computeReward, estimateReward } from "./rewards";
import { formatUnits, parseUnits } from "./money";

const UNIT = 10_000_000n;
const base = {
  cpm: 2n * UNIT,
  maxReward: 50n * UNIT,
  creatorCommitted: 0n,
  campaignAvailable: 100n * UNIT,
};

describe("computeReward", () => {
  it("demo: 10.000 vistas con CPM 2 = 20 unidades", () => {
    const r = computeReward({ ...base, verifiedViews: 10_000, rewardedViews: 0 });
    expect(r.ok).toBe(true);
    expect(r.amount).toBe(20n * UNIT);
  });

  it("demo: 7.500 vistas con CPM 2 = 15 unidades", () => {
    const r = computeReward({ ...base, verifiedViews: 7_500, rewardedViews: 0 });
    expect(r.amount).toBe(15n * UNIT);
  });

  it("solo paga vistas incrementales", () => {
    const r = computeReward({ ...base, verifiedViews: 12_000, rewardedViews: 10_000, creatorCommitted: 20n * UNIT });
    expect(r.deltaViews).toBe(2_000);
    expect(r.amount).toBe(4n * UNIT);
  });

  it("no paga dos veces las mismas vistas", () => {
    const r = computeReward({ ...base, verifiedViews: 10_000, rewardedViews: 10_000 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no_new_views");
  });

  it("usa floor con aritmética entera", () => {
    const r = computeReward({ ...base, cpm: 3n, verifiedViews: 999, rewardedViews: 0 });
    // 999 * 3 / 1000 = 2.997 -> 2
    expect(r.amount).toBe(2n);
  });

  it("limita por máximo por creador", () => {
    const r = computeReward({ ...base, verifiedViews: 100_000, rewardedViews: 0, creatorCommitted: 40n * UNIT });
    expect(r.ok).toBe(true);
    expect(r.cappedByMaxReward).toBe(true);
    expect(r.amount).toBe(10n * UNIT);
  });

  it("bloquea si el creador ya alcanzó el máximo", () => {
    const r = computeReward({ ...base, verifiedViews: 100_000, rewardedViews: 0, creatorCommitted: 50n * UNIT });
    expect(r.reason).toBe("max_reward_reached");
  });

  it("bloquea (sin prorratear) si no alcanza el disponible", () => {
    const r = computeReward({ ...base, verifiedViews: 10_000, rewardedViews: 0, campaignAvailable: 19n * UNIT });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("insufficient_budget");
    expect(r.amount).toBe(20n * UNIT);
  });
});

describe("campaignTotals", () => {
  it("separa reservado, pagado y disponible", () => {
    const t = campaignTotals({ budget: 100n * UNIT }, [
      { status: "paid", amount: 20n * UNIT },
      { status: "reserved", amount: 15n * UNIT },
      { status: "failed", amount: 5n * UNIT },
      { status: "cancelled", amount: 30n * UNIT },
    ]);
    expect(t.paid).toBe(20n * UNIT);
    expect(t.reserved).toBe(20n * UNIT);
    expect(t.available).toBe(60n * UNIT);
  });
});

describe("money", () => {
  it("parse/format sin floats", () => {
    expect(parseUnits("20")).toBe(200_000_000n);
    expect(parseUnits("0.0000001")).toBe(1n);
    expect(() => parseUnits("1.00000001")).toThrow();
    expect(formatUnits(205_000_000n)).toBe("20,5");
    expect(estimateReward(7_500, 0, 2n * UNIT)).toBe(15n * UNIT);
  });
});

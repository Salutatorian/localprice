import { describe, expect, it } from "vitest";
import { validateExtractedReceipt, isUncertain } from "@/domain/extraction";
import { mockJoetenReceipt } from "@/server/mock-extraction";
import { matchStore, selectDiscoveredStore } from "@/domain/matching";
import { assignMarket, browsingCannotAssign } from "@/domain/assignment";
import { comparableUnitPrice, unitsAreCompatible } from "@/lib/units";
import { isOutlier } from "@/domain/trust";
import { passesReceiptGate } from "@/domain/receipt-gate";
import {
  firstSubmissionHoldsPrices,
  isReportReason,
} from "@/domain/access";

describe("extraction validation", () => {
  it("accepts the mock Joeten receipt", () => {
    const { receipt, issues } = validateExtractedReceipt(mockJoetenReceipt);
    expect(receipt.merchantName).toContain("JOETEN");
    expect(issues.some((issue) => issue.code === "negative_price")).toBe(false);
  });

  it("flags yellow uncertain fields", () => {
    expect(isUncertain(0.4)).toBe(true);
    expect(isUncertain(0.95)).toBe(false);
  });
});

describe("store matching", () => {
  it("matches a Joeten alias before calling Places", () => {
    const match = matchStore("JOETEN SUSUPE", [
      {
        storeId: "joeten",
        branchId: "susupe",
        marketId: "saipan",
        name: "Joeten",
        alias: "JOETEN",
      },
    ]);
    expect(match.kind).toBe("registry");
  });

  it("picks a discovered store in the same market", () => {
    const picked = selectDiscoveredStore("Rising Supermarket", "Saipan", [
      {
        name: "Rising Supermarket",
        address: "Koblerville Main Road, Saipan 96950, Northern Mariana Islands",
      },
      {
        name: "Rising Mart",
        address: "Tamuning, Guam",
      },
    ]);
    expect(picked?.name).toBe("Rising Supermarket");
  });

  it("rejects a store whose address is not in the market", () => {
    const picked = selectDiscoveredStore("Rising Supermarket", "Saipan", [
      {
        name: "Rising Supermarket",
        address: "Tamuning, Guam",
      },
    ]);
    expect(picked).toBeNull();
  });

  it("rejects a unique local hit when the merchant name does not match", () => {
    const picked = selectDiscoveredStore("ABC MART", "Saipan", [
      {
        name: "Joeten Superstore",
        address: "Beach Road, Susupe, MP 96950",
      },
    ]);
    expect(picked).toBeNull();
  });

  it("accepts a unique Saipan hit even when the address only has a village or ZIP", () => {
    const picked = selectDiscoveredStore("JOETEN", "Saipan", [
      {
        name: "Joeten Superstore",
        address: "Beach Road, Susupe, MP 96950",
      },
    ]);
    expect(picked?.name).toBe("Joeten Superstore");
  });
});

describe("market assignment", () => {
  it("does not let browsing assign the receipt", () => {
    const result = assignMarket({
      browsingMarketId: "guam",
      verifiedBranchMarketId: "saipan",
      receiptAddressMarketId: "saipan",
      deviceMarketId: null,
      marketBoundaryHitId: "saipan",
    });
    expect(result.status).toBe("assigned");
    if (result.status === "assigned") {
      expect(result.marketId).toBe("saipan");
    }
    expect(browsingCannotAssign("guam", "saipan")).toBe(true);
  });
});

describe("unit prices", () => {
  it("compares weight to ounces and refuses mixed kinds", () => {
    const unit = comparableUnitPrice({
      lineTotalCents: 1600,
      packageSize: 2,
      unit: "lb",
    });
    expect(unit?.basis).toBe("per_oz");
    expect(unitsAreCompatible("lb", "ml")).toBe(false);
  });
});

describe("receipt gate", () => {
  it("rejects low-confidence or non-receipt images", () => {
    expect(passesReceiptGate({ isReceipt: false, confidence: 0.99 })).toBe(false);
    expect(passesReceiptGate({ isReceipt: true, confidence: 0.5 })).toBe(false);
    expect(passesReceiptGate({ isReceipt: true, confidence: 0.9 })).toBe(true);
  });
});

describe("outliers", () => {
  it("holds a 4x price against recent observations", () => {
    expect(isOutlier(4000, [900, 950, 1000, 980])).toBe(true);
    expect(isOutlier(1000, [900, 950, 1000])).toBe(false);
  });
});

describe("first receipts and reports", () => {
  it("holds a first receipt and accepts report reasons", () => {
    expect(firstSubmissionHoldsPrices(0)).toBe(true);
    expect(firstSubmissionHoldsPrices(2)).toBe(false);
    expect(isReportReason("wrong_price")).toBe(true);
    expect(isReportReason("dick-pic")).toBe(false);
  });
});

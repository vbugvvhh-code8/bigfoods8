import {
  areAllServiceAreasActive,
  canonicalZoneKey,
  isCanonicalActiveServiceArea,
  isCanonicalActiveZone,
  type ServiceLocation,
} from "./service-area.ts";

const locations: ServiceLocation[] = [
  { state: "Anambra", lga: "Awka South", is_active: true },
  { state: "Anambra", lga: "Anambra East", is_active: false },
  { state: "Lagos", lga: "Surulere", is_active: true },
  { state: "Oyo", lga: "Surulere", is_active: false },
  { state: "Lagos", lga: "Ikeja", is_active: true },
];

Deno.test("active canonical restaurant area is accepted", () => {
  if (!isCanonicalActiveServiceArea("Anambra", "Awka South", locations)) {
    throw new Error("Expected active area to be accepted");
  }
});

Deno.test("inactive and unknown restaurant areas are rejected", () => {
  if (isCanonicalActiveServiceArea("Anambra", "Anambra East", locations)) {
    throw new Error("Inactive area must be rejected");
  }
  if (isCanonicalActiveServiceArea("Anambra", "Unknown LGA", locations)) {
    throw new Error("Unknown area must be rejected");
  }
});

Deno.test("duplicate LGA names require state-qualified canonical keys", () => {
  if (canonicalZoneKey("Lagos", "Surulere", locations) !== "Surulere (Lagos)") {
    throw new Error("Expected state-qualified Lagos Surulere key");
  }
  if (!isCanonicalActiveServiceArea("Lagos", "Surulere (Lagos)", locations)) {
    throw new Error("Active state-qualified area should be accepted");
  }
  if (isCanonicalActiveServiceArea("Lagos", "Surulere", locations)) {
    throw new Error("Ambiguous plain LGA must be rejected");
  }
  if (isCanonicalActiveServiceArea("Oyo", "Surulere (Oyo)", locations)) {
    throw new Error("Inactive Oyo area must be rejected");
  }
});

Deno.test("rider zone validation rejects null and ambiguous keys", () => {
  if (!isCanonicalActiveZone("Awka South", locations)) {
    throw new Error("Active unambiguous zone should be accepted");
  }
  if (isCanonicalActiveZone(null, locations)) {
    throw new Error("Missing zone must be rejected");
  }
  if (isCanonicalActiveZone("Surulere", locations)) {
    throw new Error("Ambiguous plain LGA must be rejected");
  }
});

Deno.test("multi-restaurant batch requires every area to be active", () => {
  if (!areAllServiceAreasActive([
    { state: "Anambra", zone: "Awka South" },
    { state: "Lagos", zone: "Ikeja" },
  ], locations)) {
    throw new Error("All-active batch should be eligible");
  }
  if (areAllServiceAreasActive([
    { state: "Anambra", zone: "Awka South" },
    { state: "Anambra", zone: "Anambra East" },
  ], locations)) {
    throw new Error("Mixed active/inactive batch must be rejected");
  }
  if (areAllServiceAreasActive([], locations)) {
    throw new Error("Empty batch must not be eligible");
  }
});

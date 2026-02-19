export type ShaftApplication =
  | "driver"
  | "fairway_wood"
  | "hybrid"
  | "iron"
  | "wedge"
  | "putter";

const CATEGORY_TO_APPLICATIONS: Record<number, ShaftApplication[]> = {
  2: ["driver", "fairway_wood"],
  3: ["hybrid"],
  4: ["iron", "wedge"],
};

const APPLICATION_TO_CATEGORY: Record<ShaftApplication, number> = {
  driver: 2,
  fairway_wood: 2,
  hybrid: 3,
  iron: 4,
  wedge: 4,
  putter: 5,
};

export function inferShaftApplications(input: {
  category?: number;
  title?: string;
  type?: string;
  tip?: string;
}): ShaftApplication[] {
  const title = (input.title || "").toLowerCase();
  const type = (input.type || "").toLowerCase();
  const tip = (input.tip || "").toLowerCase();

  const inferred = new Set<ShaftApplication>();

  const categoryApps =
    typeof input.category === "number" ? CATEGORY_TO_APPLICATIONS[input.category] : undefined;
  if (categoryApps) {
    for (const app of categoryApps) inferred.add(app);
  }

  if (title.includes("hy") || title.includes("hb") || title.includes("hybrid")) {
    inferred.add("hybrid");
  }
  if (title.includes("iron") || title.includes("axiom")) {
    inferred.add("iron");
  }
  if (title.includes("wedge")) {
    inferred.add("wedge");
  }
  if (title.includes("putter")) {
    inferred.add("putter");
  }
  if (title.includes("driver")) {
    inferred.add("driver");
  }
  if (title.includes("fairway") || title.includes("fw") || title.includes("wood")) {
    inferred.add("fairway_wood");
  }

  if (type.includes("iron")) inferred.add("iron");
  if (type.includes("hybrid")) inferred.add("hybrid");
  if (type.includes("wood")) {
    inferred.add("driver");
    inferred.add("fairway_wood");
  }

  if (tip === ".370" && !inferred.has("iron")) inferred.add("hybrid");
  if (tip === ".355") {
    inferred.add("iron");
    inferred.add("wedge");
  }
  if (tip === ".335" && inferred.size === 0) {
    inferred.add("driver");
    inferred.add("fairway_wood");
  }

  if (inferred.size === 0) {
    inferred.add("driver");
    inferred.add("fairway_wood");
  }

  return Array.from(inferred);
}

export function getPrimaryCategory(applications: ShaftApplication[]): number {
  if (applications.includes("hybrid")) return APPLICATION_TO_CATEGORY.hybrid;
  if (applications.includes("iron")) return APPLICATION_TO_CATEGORY.iron;
  if (applications.includes("wedge")) return APPLICATION_TO_CATEGORY.wedge;
  if (applications.includes("putter")) return APPLICATION_TO_CATEGORY.putter;
  return APPLICATION_TO_CATEGORY.driver;
}

import { expect, test } from "@playwright/test";

test.describe("Golf Club Recommender UI", () => {
  test("home page renders and can enter the quiz flow", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Find Your Perfect Golf Clubs|Build A Precision Bag Setup|Express Fitting In Minutes/i,
      })
    ).toBeVisible();

    await page
      .getByRole("link", { name: /Get My Recommendations|Resume Quiz/i })
      .click();
    await expect(page).toHaveURL(/\/quiz$/);
    await expect(page.getByRole("heading", { level: 1, name: /Find Your Perfect Clubs/i })).toBeVisible();
  });

  test("catalog page loads clubs and filter controls", async ({ page }) => {
    await page.goto("/catalog");

    await expect(
      page.getByRole("heading", { level: 1, name: /Golf Club Catalog/i })
    ).toBeVisible();

    await expect(page.getByRole("button", { name: /^Search$/i })).toBeVisible();
    await expect(page.getByText(/Showing \d+ clubs/i)).toBeVisible();

    const cards = page.locator(".club-card");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("shaft fitting page shows expanded vendor list", async ({ page }) => {
    await page.goto("/shafts");

    await expect(page.getByRole("heading", { level: 1, name: /Shaft Fitting/i })).toBeVisible();

    const vendorSelect = page
      .locator(".filters-sidebar .filter-group")
      .first()
      .locator("select");

    await expect(vendorSelect).toBeVisible();

    const options = await vendorSelect.locator("option").allTextContents();
    expect(options).toContain("ACCRA");
    expect(options).toContain("ALDILA");
    expect(options).toContain("Nippon");
  });

  test("shaft compare flow calculates predicted changes including dispersion", async (
    { page },
    testInfo
  ) => {
    test.skip(
      testInfo.project.use.headless !== false,
      "Compare trajectory rendering requires a real WebGL context (run with --headed)."
    );

    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/compare");

    await expect(
      page.getByRole("heading", { level: 1, name: /Shaft Comparison Tool/i })
    ).toBeVisible();

    const selectorPanels = page.locator(".shaft-selector");

    await selectorPanels.nth(0).locator(".dropdown-trigger").click();
    await expect(page.locator(".dropdown-menu .dropdown-item").first()).toBeVisible();
    await page.locator(".dropdown-menu .dropdown-item").first().click();

    await selectorPanels.nth(1).locator(".dropdown-trigger").click();
    await expect(page.locator(".dropdown-menu .dropdown-item").first()).toBeVisible();
    await page.locator(".dropdown-menu .dropdown-item").first().click();

    await expect(page.locator(".selected-shaft")).toHaveCount(2);

    const compareButton = page.getByRole("button", { name: /Compare Shafts/i });
    await expect(compareButton).toBeEnabled();
    await compareButton.click();
    await expect(page).toHaveURL(/\/compare$/);

    const comparisonResults = page.locator(".comparison-results");
    await expect(comparisonResults).toBeVisible();
    expect(await comparisonResults.locator(".change-item").count()).toBeGreaterThan(0);

    await expect(page.locator(".trajectory-section canvas")).toBeVisible();
    expect(pageErrors, `Page errors: ${pageErrors.join(" | ")}`).toEqual([]);
  });
});

const { expect } = require('playwright/test');
const BasePage = require('./BasePage');
const locators = require('../locators/search.locators');

function normalizeTr(text) {
  return text.toLocaleLowerCase('tr-TR').trim();
}

class SearchResultsPage extends BasePage {
  // --- Queries ---

  get productCards() {
    return this.page.locator(locators.productCard);
  }

  get productNames() {
    return this.page.locator(locators.productName);
  }

  async waitForResults() {
    await expect(this.productCards.first()).toBeVisible({ timeout: 20000 });
  }

  async visibleProductNames(limit = 10) {
    await this.waitForResults();
    const names = await this.productNames.allTextContents();
    return names.map((n) => n.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, limit);
  }

  async productLinks(limit) {
    await this.waitForResults();
    const hrefs = await this.page
      .locator(`${locators.productCard} a[href*="-p-"]`)
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    return [...new Set(hrefs.filter(Boolean))].slice(0, limit);
  }

  // --- Validations ---

  async verifyResultsRelatedTo(term) {
    const names = await this.visibleProductNames(10);
    expect(names.length, 'No products were listed in the search results').toBeGreaterThan(0);
    const needle = normalizeTr(term);
    const matching = names.filter((name) => normalizeTr(name).includes(needle));
    expect(
      matching.length,
      `Only ${matching.length} of the first ${names.length} products contain "${term}":\n${names.join('\n')}`
    ).toBeGreaterThanOrEqual(Math.ceil(names.length / 2));
  }

  async verifyNoRealResultsFor(term) {
    await this.verifyLocatorVisibility(
      this.page.locator(locators.heading).filter({ hasText: term }),
      `The results heading does not mention the searched term "${term}"`
    );
    const names = await this.visibleProductNames(10);
    const needle = normalizeTr(term);
    const matching = names.filter((name) => normalizeTr(name).includes(needle));
    expect(
      matching,
      `Expected no real results for "${term}" but these products matched: ${matching.join(', ')}`
    ).toHaveLength(0);
  }
}

module.exports = SearchResultsPage;

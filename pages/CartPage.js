const { expect } = require('playwright/test');
const BasePage = require('./BasePage');
const locators = require('../locators/cart.locators');
const routes = require('../config/routes');
const { parsePrice } = require('../utils/price');

const SUMMARY_LOAD_TIMEOUT_MS = 20000;

class CartPage extends BasePage {
  // --- Actions ---

  async openCart() {
    await this.open(routes.cart);
    await this.verifyUrlContains('/cart', 'The cart page did not open');
    await this.verifyVisibility(
      locators.summary,
      'The cart order summary did not render',
      SUMMARY_LOAD_TIMEOUT_MS
    );
  }

  async increaseQuantity(name) {
    const item = this.itemByName(name);
    const qty = await this.quantityOf(name);

    await this.clickLocator(item.locator(locators.itemPlusButton), `plus button of "${name}"`);
    await this.verifyLocatorText(
      item.locator(locators.itemQuantityText),
      String(qty + 1),
      `Quantity of "${name}" did not increase to ${qty + 1}`
    );
  }

  async removeItem(name) {
    const item = this.itemByName(name);
    const before = await this.itemCount();
    await this.clickLocator(item.locator(locators.itemRemoveButton), `remove button of "${name}"`);

    const modal = this.page.locator(locators.removeConfirmModal);
    await this.verifyLocatorVisibility(
      modal,
      `The remove confirmation modal did not open for "${name}"`
    );
    await this.click(locators.removeConfirmButton, 'remove confirmation button');
    await this.verifyLocatorHidden(modal, 'The remove confirmation modal did not close');
    await expect
      .poll(() => this.itemCount(), {
        timeout: 20000,
        message: `"${name}" could not be removed from the cart`,
      })
      .toBeLessThan(before);
    await this.verifyLocatorCount(
      this.itemByName(name),
      0,
      `"${name}" is still listed in the cart after being removed`
    );
  }

  // --- Queries ---

  items() {
    return this.page.locator(locators.item);
  }

  itemByName(name) {
    return this.items().filter({ hasText: name }).first();
  }

  async itemCount() {
    return this.items().count();
  }

  async quantityOf(name) {
    const text = await this.itemByName(name).locator(locators.itemQuantityText).textContent();
    return parseInt(text.trim(), 10);
  }

  async waitForItems(minCount = 1) {
    await expect
      .poll(() => this.itemCount(), { timeout: 20000, message: 'Expected items in the cart' })
      .toBeGreaterThanOrEqual(minCount);
  }

  async itemLinePrices(item) {
    const currentEl = item.locator(locators.itemCurrentPrice);
    const oldEl = item.locator(locators.itemOldPrice);
    const current = parsePrice(await currentEl.textContent());
    const base = (await oldEl.count()) ? parsePrice(await oldEl.textContent()) : current;
    return { current, base };
  }

  async readSummary() {
    await this.verifyVisibility(
      locators.summary,
      'The cart order summary did not render',
      SUMMARY_LOAD_TIMEOUT_MS
    );
    const rows = await this.page.locator(locators.summaryRow).allTextContents();
    const find = (pattern) => {
      const row = rows.find((r) => pattern.test(r));
      return row === undefined ? null : parsePrice(row);
    };
    return {
      productsTotal: find(/Ürünler Toplamı/i),
      discountTotal: find(/İndirim/i) ?? 0,
      shipping: find(/Kargo/i) ?? 0,
      grandTotal: parsePrice(await this.page.locator(locators.grandTotal).textContent()),
    };
  }

  // --- Validations ---

  async verifyItemVisible(name) {
    await this.verifyLocatorVisibility(this.itemByName(name), `"${name}" is not listed in the cart`);
  }

  async verifyItemsVisible(names) {
    for (const name of names) {
      await this.verifyItemVisible(name);
    }
  }

  async verifyTotalsConsistent() {
    await this.waitForItems();

    await expect(async () => {
      const count = await this.itemCount();
      let sumOfLines = 0;
      for (let i = 0; i < count; i++) {
        sumOfLines += (await this.itemLinePrices(this.items().nth(i))).base;
      }

      const summary = await this.readSummary();
      expect(summary.productsTotal, 'Products total does not equal the sum of line totals').toBeCloseTo(
        sumOfLines,
        1
      );
      expect(summary.grandTotal, 'Grand total != products total - discount + shipping').toBeCloseTo(
        summary.productsTotal - Math.abs(summary.discountTotal) + summary.shipping,
        1
      );
    }).toPass({ timeout: 20000 });
  }
}

module.exports = CartPage;

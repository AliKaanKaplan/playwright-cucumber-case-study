const { expect } = require('playwright/test');
const BasePage = require('./BasePage');
const locators = require('../locators/product.locators');

const PRODUCT_LOAD_TIMEOUT_MS = 20000;

class ProductPage extends BasePage {
  // --- Actions ---

  async openProduct(path) {
    await this.open(path);
    await this.verifyVisibility(
      locators.title,
      `Product detail page did not load: ${path}`,
      PRODUCT_LOAD_TIMEOUT_MS
    );
  }

  async addToCart() {
    const before = await this.miniCartCount();
    const button = this.page.locator(locators.addToCartButton);
    await this.verifyLocatorVisibility(
      button,
      'Add to cart button is not visible on the product page',
      PRODUCT_LOAD_TIMEOUT_MS
    );

    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.clickLocator(button, 'add to cart button');
      try {
        await expect.poll(() => this.miniCartCount(), { timeout: 8000 }).toBeGreaterThan(before);
        return;
      } catch {
        if (attempt === 3) {
          throw new Error(`Product could not be added to cart after 3 attempts: ${this.page.url()}`);
        }
      }
    }
  }

  async addProductsToCart(links, count) {
    const added = [];

    for (const link of links) {
      if (added.length === count) break;
      try {
        await this.openProduct(link);
        const title = await this.title();
        await this.addToCart();
        added.push(title);
      } catch (err) {
        console.warn(`Product could not be added, trying the next one (${link}): ${err.message}`);
      }
    }

    expect(added, 'Not enough products could be added to the cart').toHaveLength(count);
    return added;
  }

  // --- Queries ---

  async title() {
    return (await this.page.locator(locators.title).textContent()).trim();
  }
}

module.exports = ProductPage;

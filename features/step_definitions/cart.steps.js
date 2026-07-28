const { Given, When, Then } = require('@cucumber/cucumber');
const testData = require('../../fixtures/testData');

Given('{int} product(s) from search results is/are added to the cart', async function (count) {
  await this.home.openHome();
  await this.common.search(testData.cart.searchTerm);
  const links = await this.results.productLinks(count + testData.cart.linkBuffer);
  this.data.addedProducts = await this.product.addProductsToCart(links, count);
});

When('the cart page is opened', async function () {
  await this.cart.openCart();
  await this.cart.waitForItems(this.data.addedProducts.length || 1);
});

When('the quantity of the first product in the cart is increased by one', async function () {
  await this.cart.increaseQuantity(this.data.addedProducts[0]);
});

When('the second product is removed from the cart', async function () {
  await this.cart.removeItem(this.data.addedProducts[1]);
});

Then('the added products should be listed in the cart', async function () {
  await this.cart.verifyItemsVisible(this.data.addedProducts);
});

Then('the first product should be listed in the cart', async function () {
  await this.cart.verifyItemVisible(this.data.addedProducts[0]);
});

Then('the cart totals should be calculated correctly', async function () {
  await this.cart.verifyTotalsConsistent();
});

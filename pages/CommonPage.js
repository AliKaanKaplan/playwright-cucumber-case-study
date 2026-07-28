const BasePage = require('./BasePage');
const routes = require('../config/routes');
const ELEMENTS = require('../locators/generic.locators');
const locators = require('../locators/common.locators');

const PAGES = {
  home: routes.home,
  login: routes.login,
  cart: routes.cart,
};

class CommonPage extends BasePage {
  #selectorFor(name) {
    const selector = ELEMENTS[name];
    if (!selector) {
      throw new Error(
        `Unknown element name: "${name}". Known names: ${Object.keys(ELEMENTS).join(', ')}`
      );
    }
    return selector;
  }

  #pathFor(name) {
    const pagePath = PAGES[name];
    if (pagePath === undefined) {
      throw new Error(
        `Unknown page name: "${name}". Known pages: ${Object.keys(PAGES).join(', ')}`
      );
    }
    return pagePath;
  }

  // --- Actions ---

  async openPage(pageName) {
    await this.open(this.#pathFor(pageName));
  }

  async clickElement(elementName) {
    await this.click(this.#selectorFor(elementName), elementName);
  }

  async fillField(fieldName, value) {
    await this.fill(this.#selectorFor(fieldName), value, fieldName);
  }

  async search(term) {
    const searchBox = this.page.locator(locators.searchBox);
    await this.clickLocator(searchBox, 'search box');
    await this.fillLocator(searchBox, term, 'search box');
    await this.pressLocator(searchBox, 'Enter', 'search box');

    try {
      await this.waitForUrl(
        (url) => url.pathname !== '/',
        'the search navigates away from the current page',
        7000
      );
    } catch {
      await this.open(routes.search(term));
    }

    await this.dismissOverlays();
  }

  async selectFromMyAccount(itemName) {
    const selector = locators.myAccountMenu[itemName];
    if (!selector) {
      throw new Error(
        `Unknown My Account item: "${itemName}". Known items: ${Object.keys(locators.myAccountMenu).join(', ')}`
      );
    }

    await this.hover(locators.myAccountBtn, 'My Account button');
    const item = this.page.locator(selector);
    await this.verifyLocatorVisibility(item, `"${itemName}" did not appear in the My Account menu`);
    await this.clickLocator(item, `${itemName} (My Account menu)`);
  }

  async signOutFromMyAccount() {
    await this.selectFromMyAccount('sign out');
    await this.verifyLocatorCountInDOM(
      locators.signOutLink,
      0,
      'The sign out link is still in the header; signing out did not go through'
    );
  }

  // --- Validations ---

  async verifyElementIsVisible(elementName) {
    await this.verifyVisibility(this.#selectorFor(elementName), `"${elementName}" element is not visible on the page`);
  }

  async verifyTextIsVisible(text) {
    await this.verifyTextVisibility(text, `Text "${text}" is not visible on the page`);
  }

  async verifyUrlContainsFragment(fragment) {
    await this.verifyUrlContains(fragment, `Page URL does not contain "${fragment}"`);
  }
}

module.exports = CommonPage;

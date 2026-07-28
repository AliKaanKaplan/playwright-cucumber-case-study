const config = require('../config/env');
const common = require('../locators/common.locators');
const {expect} = require("playwright/test");

const ASSERT_TIMEOUT_MS = 15000;
const ACTION_TIMEOUT_MS = 15000;

class BasePage {
    constructor(page) {
        this.page = page;
    }

    // --- Actions ---

    async open(path = '/') {
        const url = new URL(path, config.baseUrl).toString();
        await this.#act(`open "${url}"`, () =>
            this.page.goto(url, { waitUntil: 'domcontentloaded' })
        );
        await this.dismissOverlays();
    }

    async dismissOverlays() {
        const banner = this.page.locator(common.cookieBanner);
        try {
            await banner.waitFor({state: 'visible', timeout: 4000});
            await this.page.locator(common.cookieClose).click();
            await banner.waitFor({state: 'hidden', timeout: 5000});
        } catch {
        }
    }

    async click(selector, name = selector) {
        await this.clickLocator(this.page.locator(selector), name);
    }

    async clickLocator(locator, name) {
        await this.#act(`click "${name}"`, () => locator.click({ timeout: ACTION_TIMEOUT_MS }));
    }

    async fill(selector, value, name = selector) {
        await this.fillLocator(this.page.locator(selector), value, name);
    }

    async fillLocator(locator, value, name) {
        await this.#act(`fill "${name}" with "${value}"`, () =>
            locator.fill(value, { timeout: ACTION_TIMEOUT_MS })
        );
    }

    async press(selector, key, name = selector) {
        await this.pressLocator(this.page.locator(selector), key, name);
    }

    async pressLocator(locator, key, name) {
        await this.#act(`press "${key}" on "${name}"`, () =>
            locator.press(key, { timeout: ACTION_TIMEOUT_MS })
        );
    }

    async hover(selector, name = selector) {
        await this.hoverLocator(this.page.locator(selector), name);
    }

    async hoverLocator(locator, name) {
        await this.#act(`hover "${name}"`, () => locator.hover({ timeout: ACTION_TIMEOUT_MS }));
    }

    async waitForUrl(urlOrPredicate, expectation, timeout = ACTION_TIMEOUT_MS) {
        await this.#act(`wait until ${expectation}`, () =>
            this.page.waitForURL(urlOrPredicate, { timeout })
        );
    }

    async #act(what, action) {
        try {
            await action();
        } catch (err) {
            throw new Error(`Could not ${what} on ${this.page.url()}\n${err.message}`);
        }
    }

    // --- Queries ---

    async miniCartCount() {
        const badge = this.page.locator(common.miniCartBadge).first();
        if (!(await badge.count())) return 0;
        const text = (await badge.textContent()) || '';
        const value = parseInt(text.trim(), 10);
        return Number.isNaN(value) ? 0 : value;
    }

    // --- Validations ---

    async verifyLocatorText(locator, expectedText, message = 'Expected text is not matched!', timeout = ASSERT_TIMEOUT_MS) {
        await expect(locator, message).toHaveText(expectedText, { timeout });
    }

    async verifyVisibility(selector, message, timeout = ASSERT_TIMEOUT_MS) {
        await this.verifyLocatorVisibility(this.page.locator(selector), message, timeout);
    }

    async verifyLocatorVisibility(locator, message, timeout = ASSERT_TIMEOUT_MS) {
        await expect(locator, message).toBeVisible({ timeout });
    }

    async verifyHidden(selector, message, timeout = ASSERT_TIMEOUT_MS) {
        await this.verifyLocatorHidden(this.page.locator(selector), message, timeout);
    }

    async verifyLocatorHidden(locator, message, timeout = ASSERT_TIMEOUT_MS) {
        await expect(locator, message).toBeHidden({ timeout });
    }

    async verifyLocatorCountInDOM(selector, count, message, timeout = ASSERT_TIMEOUT_MS) {
        await this.verifyLocatorCount(this.page.locator(selector), count, message, timeout);
    }

    async verifyLocatorCount(locator, count, message, timeout = ASSERT_TIMEOUT_MS) {
        await expect(locator, message).toHaveCount(count, { timeout });
    }

    async verifyTextVisibility(text, message) {
        const locator = this.page.getByText(text, { exact: false }).first();
        await expect(locator, message).toBeVisible({ timeout: ASSERT_TIMEOUT_MS });
    }

    async verifyUrlContains(fragment, message) {
        await expect(this.page, message).toHaveURL((url) => url.href.includes(fragment), {
            timeout: ASSERT_TIMEOUT_MS,
        });
    }

    async verifyUrlPath(path, message) {
        await expect(this.page, message).toHaveURL((url) => url.pathname === path, {
            timeout: ASSERT_TIMEOUT_MS,
        });
    }
}

module.exports = BasePage;

const { Given, When, Then } = require('@cucumber/cucumber');

Given('the user navigates to the {string} page', async function (pageName) {
  await this.common.openPage(pageName);
});

When('the {string} element is clicked', async function (elementName) {
  await this.common.clickElement(elementName);
});

When('the {string} field is filled with {string}', async function (elementName, value) {
  await this.common.fillField(elementName, value);
});

Then('the text {string} should be visible', async function (text) {
  await this.common.verifyTextIsVisible(text);
});

Then('the {string} element should be visible', async function (elementName) {
  await this.common.verifyElementIsVisible(elementName);
});

Then('the page URL should contain {string}', async function (fragment) {
  await this.common.verifyUrlContainsFragment(fragment);
});

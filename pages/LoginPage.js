const BasePage = require('./BasePage');
const locators = require('../locators/login.locators');
const accountLocators = require('../locators/account.locators');
const routes = require('../config/routes');
const config = require('../config/env');
const testData = require('../fixtures/testData');

const PASSWORD_ERROR_TEXT = /hatalı|yanlış|şifre/i;
const LOGIN_NAVIGATION_TIMEOUT_MS = 20000;

class LoginPage extends BasePage {
  // --- Actions ---

  async openLogin() {
    await this.open(routes.login);
    await this.verifyVisibility(locators.submitButton, 'Login page did not open');
  }

  async switchToEmailTab() {
    await this.click(locators.emailTab, 'email tab');
    await this.verifyVisibility(locators.emailInput, 'Email tab did not reveal the email field');
  }

  async fillEmail(email) {
    await this.fill(locators.emailInput, email, 'email field');
  }

  async submit() {
    await this.click(locators.submitButton, 'login button');
  }

  async startExistEmailLogin(email) {
    await this.openLogin();
    await this.switchToEmailTab();
    await this.fillEmail(email);
    await this.submit();

    await this.verifyVisibility(locators.forgotBtn, "Password page is not opened.");
  }

  async submitPassword(password) {
    await this.fill(locators.passwordInput, password, 'password field');
    await this.click(locators.passwordSubmitButton, 'password submit button');
  }

  async loginWithEmail(email, password) {
    await this.startExistEmailLogin(email);
    await this.submitPassword(password);

    await this.waitForUrl(
      (url) => !url.pathname.startsWith(routes.login),
      'the login page is left after submitting the password',
      LOGIN_NAVIGATION_TIMEOUT_MS
    );
    await this.dismissOverlays();
  }

  async loginWithValidCredentials() {
    await this.loginWithEmail(config.email, config.password);
  }

  async continueWithUnregisteredEmail() {
    await this.fillEmail(testData.login.unregisteredEmail());
    await this.submit();
  }

  async attemptLoginWithWrongPassword() {
    await this.startExistEmailLogin(config.email);
    await this.submitPassword(testData.login.wrongPassword);
  }

  async openApiSession() {
    await this.open(routes.home);
    await this.dismissOverlays();
  }

  // --- Validations ---

  async verifyOnUsernameStep() {
    await this.verifyVisibility(
      locators.usernameForm,
      'The e-posta/telefon login form is not displayed'
    );
    await this.verifyUrlContains('/login', 'The user is no longer on the login page');
  }

  async verifyOnPasswordStep() {
    await this.verifyVisibility(locators.passwordForm, 'The password step is not displayed');
    await this.verifyUrlContains('/login', 'The user is no longer on the login page');
  }

  async verifyPasswordError() {
    const error = this.page
      .locator(locators.errorMessage)
      .filter({ hasText: PASSWORD_ERROR_TEXT })
      .first();
    await this.verifyLocatorVisibility(error, 'No password error message was shown for the wrong password');
  }

  async verifyLoggedIn() {
    await this.open(routes.account);
    await this.verifyUrlPath(routes.account, 'Protected page redirected away');
    await this.verifyVisibility(
      accountLocators.editPersonalInfoBtn,
      'The protected profile page did not render for the logged in user'
    );
  }

  async verifyLoggedOut() {
    await this.open(routes.account);
    await this.verifyUrlPath(
      routes.login,
      'Protected page still reachable; the session was not terminated'
    );
    await this.verifyVisibility(
      locators.usernameForm,
      'The guest login form is not displayed after logout'
    );
  }
}

module.exports = LoginPage;

const { Given, When, Then } = require('@cucumber/cucumber');

Given('the user logs in with valid credentials', async function () {
  await this.login.loginWithValidCredentials();
});

Given('the user is logged in via API', async function () {
  await this.login.openApiSession();
});

When('the user continues with an unregistered email', async function () {
  await this.login.continueWithUnregisteredEmail();
});

When('the user attempts login with a valid email and a wrong password', async function () {
  await this.login.attemptLoginWithWrongPassword();
});

Then('a password error message should be visible', async function () {
  await this.login.verifyPasswordError();
});

Then('the user should remain on the login form', async function () {
  await this.login.verifyOnUsernameStep();
});

Then('the user should remain on the password step', async function () {
  await this.login.verifyOnPasswordStep();
});

Then('the user should be successfully logged in', async function () {
  await this.login.verifyLoggedIn();
});

When('the user logs out', async function () {
  await this.common.signOutFromMyAccount();
});

Then('the session should be fully terminated', async function () {
  await this.login.verifyLoggedOut();
});

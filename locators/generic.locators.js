const login = require('./login.locators');

module.exports = {
  'email tab': login.emailTab,
  'phone tab': login.phoneTab,
  'email field': login.emailInput,
  'phone field': login.phoneInput,
  'login button': login.submitButton,
  'register form': login.registerFirstName,
};

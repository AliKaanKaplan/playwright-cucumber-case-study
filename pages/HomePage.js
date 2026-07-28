const BasePage = require('./BasePage');
const routes = require('../config/routes');

class HomePage extends BasePage {
  // --- Actions ---

  async openHome() {
    await this.open(routes.home);
  }
}

module.exports = HomePage;

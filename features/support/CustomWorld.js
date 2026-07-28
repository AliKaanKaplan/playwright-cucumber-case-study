const { setWorldConstructor, setDefaultTimeout, World } = require('@cucumber/cucumber');
const config = require('../../config/env');
const CommonPage = require('../../pages/CommonPage');
const HomePage = require('../../pages/HomePage');
const LoginPage = require('../../pages/LoginPage');
const SearchResultsPage = require('../../pages/SearchResultsPage');
const ProductPage = require('../../pages/ProductPage');
const CartPage = require('../../pages/CartPage');

setDefaultTimeout(config.defaultTimeout * 4);

class CustomWorld extends World {
  constructor(options) {
    super(options);
    this.context = null;
    this.page = null;
    this.data = { addedProducts: [] };
  }

  initPages() {
    this.common = new CommonPage(this.page);
    this.home = new HomePage(this.page);
    this.login = new LoginPage(this.page);
    this.results = new SearchResultsPage(this.page);
    this.product = new ProductPage(this.page);
    this.cart = new CartPage(this.page);
  }
}

setWorldConstructor(CustomWorld);

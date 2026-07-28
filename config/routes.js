module.exports = {
  home: '/',
  login: '/login',
  cart: '/cart',
  account: '/my-account/update-profile',
  search: (term) => `/search?text=${encodeURIComponent(term)}`,
};

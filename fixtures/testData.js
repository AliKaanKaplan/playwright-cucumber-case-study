module.exports = {
    search: {
        noResultTerm: () => `qatest${Date.now().toString(36)}xz`,
    },
    cart: {
        searchTerm: 'biberon',
        linkBuffer: 4,
    },
    login: {
        unregisteredEmail: () => `qa.otomasyon.${Date.now().toString(36)}@example.com`,
        wrongPassword: 'Wrong-Password-123!',
    },
};
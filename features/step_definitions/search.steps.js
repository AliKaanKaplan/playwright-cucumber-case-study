const { When, Then } = require('@cucumber/cucumber');
const testData = require('../../fixtures/testData');

When('the user searches for {string}', async function (term) {
  await this.common.search(term);
});

When('the user searches for a random term with no results', async function () {
  this.data.noResultTerm = testData.search.noResultTerm();
  await this.common.search(this.data.noResultTerm);
});

Then('the result list should be related to the {string} search', async function (term) {
  await this.results.verifyResultsRelatedTo(term);
});

Then('the search should return no real results', async function () {
  await this.results.verifyNoRealResultsFor(this.data.noResultTerm);
});

@search
Feature: Search Feature
  Verifies product search: a query that returns products related to the search
  term, and a query that returns no real results.

  @smoke @regression
  Scenario: S3 - Search with results lists products related to the search term
    Given the user navigates to the "home" page
    When the user searches for "biberon"
    Then the result list should be related to the "biberon" search

  @regression @negative
  Scenario: S3 - Search with no results does not list any real match
    Given the user navigates to the "home" page
    When the user searches for a random term with no results
    Then the search should return no real results

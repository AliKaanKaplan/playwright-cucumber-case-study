@state
Feature: Session State Feature
  Verifies session continuity: a product added to the cart as a guest is
  preserved after the user logs in.

  @regression @auth
  Scenario: S5 - Guest cart is preserved after login
    Given 1 product from search results is added to the cart
    When the user logs in with valid credentials
    And the cart page is opened
    Then the added products should be listed in the cart

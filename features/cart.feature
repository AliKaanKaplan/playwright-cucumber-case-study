@cart
Feature: Cart Feature
  Verifies the shopping cart workflow: adding products, increasing quantity and
  removing an item, with the subtotal and total recalculated and checked
  numerically after every change.

  @smoke @regression
  Scenario: S4 - Add to cart, increase quantity, remove and verify totals
    Given 2 products from search results are added to the cart
    When the cart page is opened
    Then the added products should be listed in the cart
    And the cart totals should be calculated correctly
    When the quantity of the first product in the cart is increased by one
    Then the cart totals should be calculated correctly
    When the second product is removed from the cart
    Then the first product should be listed in the cart
    And the cart totals should be calculated correctly

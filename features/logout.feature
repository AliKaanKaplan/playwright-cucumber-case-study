@logout
Feature: Logout Feature
  Verifies logout: after signing out the session is truly terminated and a
  page requiring authentication is no longer accessible (guest state).

  @regression @auth
  Scenario: S6 - Session is truly terminated after logout
    Given the user logs in with valid credentials
    And the user should be successfully logged in
    When the user logs out
    Then the session should be fully terminated

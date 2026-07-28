@api @auth @regression
Feature: API-based login (hybrid)
  Demonstrates the API + UI hybrid (B1): authentication is established via the
  OAuth password-grant API and injected as browser storage state (spartacus auth
  token), so no slow UI login is needed. Verification and logout happen in the UI —
  proving the API-injected session behaves like a real one.

  Scenario: B1 - Session established via API is recognised and endable in the UI
    Given the user is logged in via API
    Then the user should be successfully logged in
    When the user logs out
    Then the session should be fully terminated
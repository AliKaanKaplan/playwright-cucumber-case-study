@login
Feature: Login Feature
  Verifies user authentication: successful login with valid credentials, plus
  negative attempts (invalid email/phone format, empty required fields,
  unregistered email, wrong password) each showing the expected outcome.

  @smoke @auth
  Scenario: S1 - Successful login with valid credentials
    Given the user logs in with valid credentials
    Then the user should be successfully logged in

  @regression @negative
  Scenario Outline: S2 - Validation message is shown for invalid login attempt: <case>
    Given the user navigates to the "login" page
    When the "<tab>" element is clicked
    And the "<field>" field is filled with "<value>"
    And the "login button" element is clicked
    Then the text "<message>" should be visible
    And the user should remain on the login form

    Examples:
      | case                 | tab       | field       | value         | message                              |
      | invalid email format | email tab | email field | invalid-email | Geçerli bir e-posta adresi giriniz   |
      | empty email field    | email tab | email field |               | Bu alan gereklidir.                  |
      | empty phone number   | phone tab | phone field |               | geçerli bir telefon numarası giriniz |
      | short phone number   | phone tab | phone field | 555           | geçerli bir telefon numarası giriniz |

  @regression @negative
  Scenario: S2 - Unregistered email is redirected to the registration form
    Given the user navigates to the "login" page
    When the "email tab" element is clicked
    And the user continues with an unregistered email
    Then the page URL should contain "login/register"
    And the "register form" element should be visible

  @regression @negative @auth
  Scenario: S2 - Login with wrong password is rejected
    When the user attempts login with a valid email and a wrong password
    Then a password error message should be visible
    And the user should remain on the password step

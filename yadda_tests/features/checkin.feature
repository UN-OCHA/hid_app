Feature: HID Check In / Out

Background:

  Given I am logged into the HID APP as [role]

  Scenario Outline: Checking into the HID dashboard

    Given I am not checked into the Philippines
     When I click Check-in
      And I wait for the text Select a country
      And I click Philippines
     Then I should see Philippines Profile
     When I submit the profileForm form
     Then I should see Philippines
     When I click Logout

    Examples:
      role    |
      admin   |

  Scenario Outline:: Checking out of the HID dashboard

    Given I am checked into the Philippines
     When I checkout of the Philippines
      And I wait for 3 seconds
     Then I should not see Philippines
     When I click Logout

    Examples:
      role    |
      admin   |

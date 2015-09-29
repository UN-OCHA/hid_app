Feature: HID Header Links

  Scenario Outline: Humanitarian Response Link
    When I press header link with class .humanitarian-response
    Then I should be on https://www.humanitarianresponse.info/

  Scenario Outline: HDX Header Link
    When I press header link with class .hdx
    Then I should be on https://data.hdx.rwlabs.org/

  Scenario Outline: Relief Web Link
    When I press header link with class .relief-web
    Then I should be on http://reliefweb.int/

package com.nexus.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class LoginPage extends BasePage {

    private final By emailInput = By.cssSelector("input[type='email'], #email, input[name='email']");
    private final By passwordInput = By.cssSelector("input[type='password'], #password, input[name='password']");
    private final By submitButton = By.cssSelector("button[type='submit']");
    private final By errorMessage = By.cssSelector("[data-sonner-toast], [role='status'], [role='alert'], .text-destructive, .error-message");

    public LoginPage(WebDriver driver) {
        super(driver);
    }

    public void open(String baseUrl) {
        driver.get(baseUrl + "/login");
    }

    public boolean isLoginFormVisible() {
        return isDisplayed(emailInput) && isDisplayed(passwordInput) && isDisplayed(submitButton);
    }

    public void login(String email, String password) {
        sendKeys(emailInput, email);
        sendKeys(passwordInput, password);
        click(submitButton);
    }

    public boolean isErrorMessageDisplayed() {
        return isDisplayed(errorMessage);
    }
}

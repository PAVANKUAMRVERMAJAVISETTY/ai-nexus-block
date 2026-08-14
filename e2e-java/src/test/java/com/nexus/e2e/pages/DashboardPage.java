package com.nexus.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class DashboardPage extends BasePage {

    private final By header = By.tagName("h1");
    private final By assistantLink = By.cssSelector("a[href='/assistant']");
    private final By projectsLink = By.cssSelector("a[href='/projects']");
    private final By ideLink = By.cssSelector("a[href='/ide']");

    public DashboardPage(WebDriver driver) {
        super(driver);
    }

    public void open(String baseUrl) {
        driver.get(baseUrl + "/dashboard");
    }

    public boolean isLoaded() {
        return driver.getCurrentUrl().contains("/dashboard") || isDisplayed(header);
    }

    public void navigateToAssistant() {
        click(assistantLink);
    }

    public void navigateToProjects() {
        click(projectsLink);
    }

    public void navigateToIDE() {
        click(ideLink);
    }
}

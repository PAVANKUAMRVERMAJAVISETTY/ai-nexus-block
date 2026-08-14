package com.nexus.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class ProjectDetailsPage extends BasePage {

    private final By projectTitle = By.tagName("h1");
    private final By openInIdeLink = By.cssSelector("a[href^='/ide']");

    public ProjectDetailsPage(WebDriver driver) {
        super(driver);
    }

    public void open(String baseUrl, String slug) {
        driver.get(baseUrl + "/projects/" + slug);
    }

    public boolean isLoaded() {
        return isDisplayed(projectTitle);
    }

    public boolean hasOpenInIdeButton() {
        return isDisplayed(openInIdeLink);
    }
}

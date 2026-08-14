package com.nexus.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class ProjectsPage extends BasePage {

    private final By header = By.tagName("h1");
    private final By projectCards = By.cssSelector("a[href^='/projects/'], .group.relative");

    public ProjectsPage(WebDriver driver) {
        super(driver);
    }

    public void open(String baseUrl) {
        driver.get(baseUrl + "/projects");
    }

    public boolean isLoaded() {
        return driver.getCurrentUrl().contains("/projects") || isDisplayed(header);
    }

    public boolean hasProjectCards() {
        return !driver.findElements(projectCards).isEmpty();
    }
}

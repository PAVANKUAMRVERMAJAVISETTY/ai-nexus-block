package com.nexus.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class ToolsPage extends BasePage {

    private final By header = By.tagName("h1");

    public ToolsPage(WebDriver driver) {
        super(driver);
    }

    public void open(String baseUrl) {
        driver.get(baseUrl + "/tools");
    }

    public boolean isLoaded() {
        return driver.getCurrentUrl().contains("/tools") || isDisplayed(header);
    }
}

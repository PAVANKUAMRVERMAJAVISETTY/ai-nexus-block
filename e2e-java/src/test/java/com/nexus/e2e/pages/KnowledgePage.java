package com.nexus.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class KnowledgePage extends BasePage {

    private final By header = By.tagName("h1");

    public KnowledgePage(WebDriver driver) {
        super(driver);
    }

    public void open(String baseUrl) {
        driver.get(baseUrl + "/knowledge");
    }

    public boolean isLoaded() {
        return driver.getCurrentUrl().contains("/knowledge") || isDisplayed(header);
    }
}

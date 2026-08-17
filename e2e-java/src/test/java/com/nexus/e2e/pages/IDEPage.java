package com.nexus.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class IDEPage extends BasePage {

    private final By header = By.tagName("h1");
    private final By exportButton = By.cssSelector("button[aria-label='Export project as ZIP']");
    private final By fileTreeContainer = By.cssSelector("[class*='file-tree'], [class*='tree']");
    private final By pendingActionsPanel = By.cssSelector("[class*='pending-action'], [class*='agent-action']");

    public IDEPage(WebDriver driver) {
        super(driver);
    }

    public void open(String baseUrl) {
        driver.get(baseUrl + "/ide");
    }

    public void openProject(String baseUrl, String projectId) {
        driver.get(baseUrl + "/ide/" + projectId);
    }

    public boolean isLoaded() {
        return driver.getCurrentUrl().contains("/ide") || isDisplayed(header);
    }

    public boolean isExportButtonVisible() {
        return isDisplayed(exportButton);
    }

    public boolean isFileTreeVisible() {
        return isDisplayed(fileTreeContainer);
    }

    public boolean isPendingActionsPanelVisible() {
        return isDisplayed(pendingActionsPanel);
    }

    public void clickExportButton() {
        click(exportButton);
    }
}

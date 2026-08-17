package com.nexus.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class AssistantPage extends BasePage {

    private final By composerInput = By.cssSelector("input[placeholder*='Ask Nexus Assistant'], input[placeholder*='Ask Nexus']");
    private final By sendButton = By.cssSelector("button[aria-label='Send message']");
    private final By attachmentButton = By.cssSelector("button[aria-label='Attach files']");
    private final By microphoneButton = By.cssSelector("button[aria-label='Start voice recording']");
    private final By ttsButton = By.cssSelector("button[aria-label='Read response aloud'], button[aria-label='Stop speaking']");
    private final By messagesList = By.cssSelector(".whitespace-pre-wrap");
    private final By modeSelectorButtons = By.cssSelector("button:has(.lucide-wrench), button:has(.lucide-code-2)");

    public AssistantPage(WebDriver driver) {
        super(driver);
    }

    public void open(String baseUrl) {
        driver.get(baseUrl + "/assistant");
    }

    public boolean isComposerVisible() {
        return isDisplayed(composerInput) && isDisplayed(sendButton);
    }

    public boolean isAttachmentButtonVisible() {
        return isDisplayed(attachmentButton);
    }

    public boolean isMicrophoneButtonVisible() {
        return isDisplayed(microphoneButton);
    }

    public boolean isTTSButtonVisible() {
        return isDisplayed(ttsButton);
    }

    public boolean isModeSelectorVisible() {
        return isDisplayed(modeSelectorButtons);
    }

    public void sendMessage(String text) {
        sendKeys(composerInput, text);
        click(sendButton);
    }

    public int getMessageCount() {
        return driver.findElements(messagesList).size();
    }
}

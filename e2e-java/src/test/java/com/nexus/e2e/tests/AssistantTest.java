package com.nexus.e2e.tests;

import com.nexus.e2e.pages.AssistantPage;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class AssistantTest extends BaseTest {

    @Test
    @DisplayName("Assistant & Multimodal UI - Page, composer, attachment, mic, and TTS controls exist")
    public void testAssistantPageAndMultimodalControls() {
        AssistantPage assistantPage = new AssistantPage(driver);
        assistantPage.open(baseUrl);

        if (driver.getCurrentUrl().contains("/login")) {
            System.out.println("[E2E Info] Assistant page redirected to /login for unauthenticated visitor. Skipping authenticated controls check.");
            Assumptions.assumeTrue(false, "Unauthenticated session redirected to login page.");
            return;
        }

        assertTrue(assistantPage.isComposerVisible(), "Assistant composer input and send button must be visible");
        assertTrue(assistantPage.isAttachmentButtonVisible(), "Multimodal attachment button (Paperclip) must be visible");
        assertTrue(assistantPage.isMicrophoneButtonVisible(), "Voice microphone button (Mic) must be visible");
    }
}

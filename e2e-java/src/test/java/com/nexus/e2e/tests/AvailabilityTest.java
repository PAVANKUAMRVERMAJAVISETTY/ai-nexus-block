package com.nexus.e2e.tests;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class AvailabilityTest extends BaseTest {

    @Test
    @DisplayName("Application availability - Base URL opens and renders without fatal error")
    public void testApplicationAvailability() {
        driver.get(baseUrl);
        String currentUrl = driver.getCurrentUrl();
        String pageSource = driver.getPageSource();

        assertNotNull(currentUrl, "Current URL must not be null");
        assertTrue(currentUrl.startsWith(baseUrl) || currentUrl.contains("localhost") || currentUrl.contains("127.0.0.1"),
                "Application URL should match configured base URL");
        assertFalse(pageSource.contains("Application error: a client-side exception has occurred"),
                "Page must not contain fatal React client rendering error");
    }
}

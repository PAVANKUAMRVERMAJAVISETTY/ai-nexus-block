package com.nexus.e2e.tests;

import com.nexus.e2e.config.TestConfig;
import com.nexus.e2e.utils.ArtifactUtils;
import com.nexus.e2e.utils.DriverFactory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestInfo;
import org.openqa.selenium.WebDriver;

public abstract class BaseTest {

    protected WebDriver driver;
    protected String baseUrl;

    @BeforeEach
    public void setUp() {
        this.baseUrl = TestConfig.getBaseUrl();
        if (!TestConfig.isServerReachable()) {
            System.out.println("[E2E Info] Target application server at " + baseUrl + " is not currently reachable. Skipping live browser test cleanly.");
            Assumptions.assumeTrue(false, "Target application server at " + baseUrl + " is offline; skipped live browser test.");
            return;
        }
        this.driver = DriverFactory.createDriver();
    }

    @AfterEach
    public void tearDown(TestInfo testInfo) {
        if (driver != null) {
            try {
                String testName = testInfo.getDisplayName();
                ArtifactUtils.captureFailureArtifacts(driver, testName);
            } catch (Exception e) {
                // Ignore teardown errors
            } finally {
                driver.quit();
            }
        }
    }
}

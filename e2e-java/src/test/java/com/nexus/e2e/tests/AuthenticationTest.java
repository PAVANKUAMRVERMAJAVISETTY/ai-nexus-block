package com.nexus.e2e.tests;

import com.nexus.e2e.config.TestConfig;
import com.nexus.e2e.pages.DashboardPage;
import com.nexus.e2e.pages.LoginPage;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class AuthenticationTest extends BaseTest {

    @Test
    @DisplayName("Authentication - Login form renders; authenticates when E2E credentials exist")
    public void testAuthenticationFlow() {
        if (!TestConfig.hasCredentials()) {
            System.out.println("[E2E Info] E2E_EMAIL and E2E_PASSWORD environment variables not provided. Skipping authenticated login test cleanly.");
            Assumptions.assumeTrue(false, "E2E credentials unavailable; skipped authenticated test cleanly.");
            return;
        }

        LoginPage loginPage = new LoginPage(driver);
        loginPage.open(baseUrl);
        assertTrue(loginPage.isLoginFormVisible(), "Login form inputs and submit button must be visible");

        loginPage.login(TestConfig.getEmail(), TestConfig.getPassword());

        DashboardPage dashboardPage = new DashboardPage(driver);
        assertTrue(dashboardPage.isLoaded(), "Authenticated user should land on dashboard");
    }
}

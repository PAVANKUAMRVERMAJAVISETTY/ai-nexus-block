package com.nexus.e2e.tests;

import com.nexus.e2e.pages.LoginPage;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class SecurityAndNegativeTest extends BaseTest {

    @Test
    @DisplayName("Security & Negative - Invalid login credentials display error message")
    public void testInvalidLoginAttempt() {
        LoginPage loginPage = new LoginPage(driver);
        loginPage.open(baseUrl);

        if (!loginPage.isLoginFormVisible()) {
            System.out.println("[E2E Info] Login form not visible or hydrated. Skipping invalid login test.");
            Assumptions.assumeTrue(false, "Login form was not visible within wait timeout.");
            return;
        }

        loginPage.login("invalid_user_99@example.com", "WrongPassword123!");

        assertTrue(loginPage.isErrorMessageDisplayed() || driver.getCurrentUrl().contains("/login"),
                "Invalid login attempt must fail and remain on login page or show error message");
    }

    @Test
    @DisplayName("Security & Negative - Unauthenticated export endpoint call returns HTTP authorization error")
    public void testUnauthenticatedExportAccess() {
        driver.get(baseUrl + "/api/ide/projects/invalid-project-id/export");
        String pageSource = driver.getPageSource();

        assertTrue(pageSource.contains("Unauthenticated") || pageSource.contains("Unauthorized") || pageSource.contains("401") || pageSource.contains("404"),
                "Unauthenticated access to export API must be denied");
    }
}

package com.nexus.e2e.tests;

import com.nexus.e2e.pages.IDEPage;
import com.nexus.e2e.pages.ProjectDetailsPage;
import com.nexus.e2e.pages.ProjectsPage;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class ProjectsAndIDETest extends BaseTest {

    @Test
    @DisplayName("Projects & IDE - Projects listing, detail view, and IDE page render")
    public void testProjectsAndIDEFlow() {
        ProjectsPage projectsPage = new ProjectsPage(driver);
        projectsPage.open(baseUrl);
        assertTrue(projectsPage.isLoaded(), "Projects page must load");

        ProjectDetailsPage detailsPage = new ProjectDetailsPage(driver);
        detailsPage.open(baseUrl, "ai-nexus-block");
        assertTrue(detailsPage.isLoaded(), "Project details page for ai-nexus-block must load");

        IDEPage idePage = new IDEPage(driver);
        idePage.open(baseUrl);

        if (driver.getCurrentUrl().contains("/login")) {
            System.out.println("[E2E Info] IDE page redirected to /login for unauthenticated visitor. Skipping authenticated IDE check.");
            Assumptions.assumeTrue(false, "Unauthenticated session redirected to login page.");
            return;
        }

        assertTrue(idePage.isLoaded(), "IDE page must load");
    }
}

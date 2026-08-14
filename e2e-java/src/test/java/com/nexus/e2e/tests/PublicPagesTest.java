package com.nexus.e2e.tests;

import com.nexus.e2e.pages.KnowledgePage;
import com.nexus.e2e.pages.ProjectsPage;
import com.nexus.e2e.pages.ToolsPage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class PublicPagesTest extends BaseTest {

    @Test
    @DisplayName("Public pages - /projects, /tools, /knowledge load successfully")
    public void testPublicPages() {
        ProjectsPage projectsPage = new ProjectsPage(driver);
        projectsPage.open(baseUrl);
        assertTrue(projectsPage.isLoaded(), "Projects page must load successfully");

        ToolsPage toolsPage = new ToolsPage(driver);
        toolsPage.open(baseUrl);
        assertTrue(toolsPage.isLoaded(), "Tools page must load successfully");

        KnowledgePage knowledgePage = new KnowledgePage(driver);
        knowledgePage.open(baseUrl);
        assertTrue(knowledgePage.isLoaded(), "Knowledge page must load successfully");
    }
}

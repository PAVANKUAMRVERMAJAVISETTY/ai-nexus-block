package com.nexus.e2e.utils;

import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;

import java.io.File;
import java.io.FileWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class ArtifactUtils {

    private static final String ARTIFACTS_DIR = "target/artifacts";

    public static void captureFailureArtifacts(WebDriver driver, String testName) {
        if (driver == null) return;

        try {
            Path artifactsPath = Paths.get(ARTIFACTS_DIR);
            if (!Files.exists(artifactsPath)) {
                Files.createDirectories(artifactsPath);
            }

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String safeTestName = testName.replaceAll("[^a-zA-Z0-9-_]", "_");

            // 1. Capture Screenshot
            if (driver instanceof TakesScreenshot) {
                File srcFile = ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);
                Path destFile = artifactsPath.resolve(safeTestName + "_" + timestamp + ".png");
                Files.copy(srcFile.toPath(), destFile);
                System.out.println("[E2E Artifact] Screenshot saved to: " + destFile.toAbsolutePath());
            }

            // 2. Capture URL and page source summary
            Path txtFile = artifactsPath.resolve(safeTestName + "_" + timestamp + ".txt");
            try (FileWriter writer = new FileWriter(txtFile.toFile())) {
                writer.write("Test Name: " + testName + "\n");
                writer.write("Timestamp: " + timestamp + "\n");
                writer.write("Current URL: " + driver.getCurrentUrl() + "\n");
                writer.write("Page Title: " + driver.getTitle() + "\n\n");
                writer.write("--- Page Text Excerpt ---\n");
                String pageText = driver.getPageSource();
                if (pageText.length() > 5000) {
                    pageText = pageText.substring(0, 5000) + "\n...[truncated]";
                }
                writer.write(pageText);
            }
            System.out.println("[E2E Artifact] Log saved to: " + txtFile.toAbsolutePath());
        } catch (Exception e) {
            System.err.println("[E2E Artifact] Failed to capture failure artifacts: " + e.getMessage());
        }
    }
}

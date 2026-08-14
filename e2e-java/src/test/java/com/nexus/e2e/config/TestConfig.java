package com.nexus.e2e.config;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class TestConfig {

    public static String getBaseUrl() {
        String prop = System.getProperty("baseUrl");
        if (prop != null && !prop.trim().isEmpty()) {
            return prop.trim().replaceAll("/+$", "");
        }
        String env = System.getenv("E2E_BASE_URL");
        if (env != null && !env.trim().isEmpty()) {
            return env.trim().replaceAll("/+$", "");
        }
        return "http://localhost:3000";
    }

    public static boolean isHeadless() {
        String prop = System.getProperty("headless");
        if (prop != null && !prop.trim().isEmpty()) {
            return Boolean.parseBoolean(prop.trim());
        }
        String env = System.getenv("E2E_HEADLESS");
        if (env != null && !env.trim().isEmpty()) {
            return Boolean.parseBoolean(env.trim());
        }
        return true;
    }

    public static String getEmail() {
        String prop = System.getProperty("E2E_EMAIL");
        if (prop != null && !prop.trim().isEmpty()) return prop.trim();
        return System.getenv("E2E_EMAIL");
    }

    public static String getPassword() {
        String prop = System.getProperty("E2E_PASSWORD");
        if (prop != null && !prop.trim().isEmpty()) return prop.trim();
        return System.getenv("E2E_PASSWORD");
    }

    public static boolean hasCredentials() {
        String email = getEmail();
        String password = getPassword();
        return email != null && !email.trim().isEmpty() && password != null && !password.trim().isEmpty();
    }

    public static boolean isServerReachable() {
        try {
            URL url = new URL(getBaseUrl() + "/api/health");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(1000);
            conn.setReadTimeout(1000);
            conn.setRequestMethod("GET");
            if (conn.getResponseCode() != 200) {
                return false;
            }
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                return sb.toString().contains("ai-nexus-block");
            }
        } catch (Exception e) {
            return false;
        }
    }
}

# Supabase Auth Custom SMTP Setup via Brevo

This document describes how to configure Brevo (formerly Sendinblue) as your custom SMTP email provider for Supabase Authentication rate limits and custom branding.

> [!IMPORTANT]
> **DO NOT** add Brevo SMTP secrets into `.env.local`, client code, or database tables. All SMTP configuration must be entered directly inside the **Supabase Dashboard**.

---

## Step 1: Obtain Brevo SMTP Credentials

1. Sign in to your [Brevo Account](https://app.brevo.com/).
2. Navigate to **Transactional** -> **Settings** -> **SMTP & API**.
3. Under the **SMTP** tab, note down:
   - **SMTP Server**: `smtp-relay.brevo.com`
   - **Port**: `587` (TLS)
   - **Login**: Your Brevo account email address
   - **SMTP Key**: Generate a new SMTP key (Note: Use the **SMTP key**, NOT your Brevo REST API Key).

---

## Step 2: Configure Supabase Authentication Settings

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **Project Settings** -> **Authentication** -> **SMTP Settings**.
3. Toggle **Enable Custom SMTP** to `ON`.
4. Enter the following values:

| Field | Value |
|---|---|
| **Sender Email** | `noreply@yourdomain.com` (Must be an authenticated sender in Brevo) |
| **Sender Name** | `AI Nexus Block` |
| **Host** | `smtp-relay.brevo.com` |
| **Port** | `587` |
| **Minimum Transport Security** | `TLS` |
| **Username** | Your Brevo Login Email |
| **Password** | Your Brevo **SMTP Key** |

5. Click **Save**.

---

## Step 3: Verification & Email Rate Limits

- Sending custom SMTP through Brevo bypasses Supabase's default built-in rate limit (3 emails per hour on free tier).
- All authentication flow operations (signup verification, password reset emails, magic links) will now route directly through Brevo.

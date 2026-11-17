import "server-only";

function env(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

/** Settings read at request time (Cloudflare provides them via process.env). */
export function getConfig() {
  return {
    appUrl: env("APP_URL", "http://localhost:3000").replace(/\/$/, ""),
    orgName: env("ORG_NAME", "ISKCON Detroit"),
    orgLegalName: env("ORG_LEGAL_NAME", env("ORG_NAME", "ISKCON Detroit")),
    orgEin: env("ORG_EIN", "00-0000000"),
    orgAddress: env("ORG_ADDRESS"),
    orgEmail: env("ORG_EMAIL"),
    orgWebsite: env("ORG_WEBSITE"),
    zelleRecipient: env("ZELLE_RECIPIENT"),
    emailFrom: env("EMAIL_FROM", "ISKCON Detroit Seva <onboarding@resend.dev>"),
    feePercent: Number(env("FEE_PERCENT", "2.2")),
    feeFixedCents: Number(env("FEE_FIXED_CENTS", "30")),
    timezone: env("TIMEZONE", "America/Detroit"),
  };
}

export function bootstrapAdminEmails(): string[] {
  return env("ADMIN_EMAILS")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

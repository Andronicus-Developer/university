export type IntegrationFieldType =
  | "text"
  | "url"
  | "email"
  | "number"
  | "secret"
  | "select"
  | "toggle";

export type IntegrationStatus = "connected" | "not_configured" | "disabled";
export type IntegrationMode = "live" | "test";

export interface IntegrationFieldOption {
  value: string;
  label: string;
}

export interface IntegrationFieldDef {
  key: string;
  label: string;
  type: IntegrationFieldType;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  isSecret?: boolean;
  options?: IntegrationFieldOption[];
  defaultValue?: string | boolean;
}

export interface IntegrationDefinition {
  slug: string;
  name: string;
  category: string;
  description: string;
  docsHint: string;
  webhookPath?: string;
  fields: IntegrationFieldDef[];
  isCustom?: boolean;
}

export interface SafeIntegrationRecord {
  slug: string;
  name: string;
  category: string;
  description: string;
  docsHint: string;
  webhookPath?: string;
  isCustom: boolean;
  isEnabled: boolean;
  mode: IntegrationMode;
  status: IntegrationStatus;
  config: Record<string, string | boolean>;
  maskedSecrets: Record<string, string>;
  hasSecrets: Record<string, boolean>;
  lastSyncedAt: string | null;
  updatedAt: string | null;
  fields: IntegrationFieldDef[];
}

export const CUSTOM_INTEGRATION_FIELDS: IntegrationFieldDef[] = [
  {
    key: "api_url",
    label: "Base API URL / Endpoint",
    type: "url",
    placeholder: "https://api.example.com/v1",
    helperText: "Primary HTTPS base URL for outbound API requests.",
    required: true,
    defaultValue: "",
  },
  {
    key: "public_key",
    label: "Public / Client Key",
    type: "text",
    placeholder: "pk_live_...",
    helperText: "Non-secret client identifier or tenant key (optional).",
    required: false,
    defaultValue: "",
  },
  {
    key: "secret_key",
    label: "API Secret Key / Bearer Token",
    type: "secret",
    placeholder: "sk_live_...",
    helperText: "Server-side authentication token stored confidentially.",
    required: true,
    isSecret: true,
  },
  {
    key: "webhook_secret",
    label: "Webhook Signing Secret",
    type: "secret",
    placeholder: "whsec_...",
    helperText: "Optional HMAC secret used to verify incoming webhooks.",
    required: false,
    isSecret: true,
  },
];

export const DEFAULT_INTEGRATIONS: IntegrationDefinition[] = [
  {
    slug: "moodle-lms",
    name: "Moodle Learning Management System (LMS)",
    category: "E-Learning",
    description:
      "Automated student cohort sync, course enrollment provisioning, and gradebook passback.",
    docsHint:
      "Generate a Web Service REST token inside Moodle Site Administration -> Server -> Web services.",
    webhookPath: "/api/webhooks/moodle-lms",
    fields: [
      {
        key: "api_url",
        label: "Moodle Site / REST API URL",
        type: "url",
        placeholder: "https://lms.yourschool.edu",
        helperText: "Root HTTPS URL of your Moodle instance without a trailing slash.",
        required: true,
        defaultValue: "",
      },
      {
        key: "webservice_token",
        label: "Web Service REST Token",
        type: "secret",
        placeholder: "Paste Moodle webservice token",
        helperText: "Privileged REST API token for cohort and course synchronization.",
        required: true,
        isSecret: true,
      },
      {
        key: "default_category_id",
        label: "Default Course Category ID",
        type: "text",
        placeholder: "1",
        helperText: "Optional Moodle category ID used when provisioning new programs.",
        required: false,
        defaultValue: "",
      },
      {
        key: "webhook_secret",
        label: "Grade Passback Webhook Secret",
        type: "secret",
        placeholder: "whsec_...",
        helperText: "Shared secret for verifying Moodle gradebook callbacks.",
        required: false,
        isSecret: true,
      },
      {
        key: "auto_sync_enrollments",
        label: "Automatic Enrollment Synchronization",
        type: "toggle",
        helperText:
          "Sync newly enrolled students and course allocations to Moodle automatically.",
        defaultValue: true,
      },
    ],
  },
  {
    slug: "paystack",
    name: "Paystack Payments & Mobile Money Gateway",
    category: "Fintech",
    description:
      "Card checkout, MTN MoMo, Telecel Cash, and automated webhook settlement across campuses.",
    docsHint:
      "Retrieve your Public Key and Secret Key from Paystack Dashboard -> Settings -> API Keys & Webhooks.",
    webhookPath: "/api/webhooks/paystack",
    fields: [
      {
        key: "provider",
        label: "Primary Payment Processor",
        type: "select",
        required: true,
        defaultValue: "paystack",
        options: [
          { value: "paystack", label: "Paystack (Cards, MTN MoMo, Telecel Cash)" },
          { value: "hubtel", label: "Hubtel Direct Merchant Gateway" },
          { value: "flutterwave", label: "Flutterwave Central" },
        ],
        helperText: "Active checkout aggregator used for student fee collection.",
      },
      {
        key: "public_key",
        label: "Public API Key",
        type: "text",
        placeholder: "pk_test_... or pk_live_...",
        helperText: "Publishable gateway key safe for checkout initialization.",
        required: true,
        defaultValue: "",
      },
      {
        key: "secret_key",
        label: "Secret API Key",
        type: "secret",
        placeholder: "sk_test_... or sk_live_...",
        helperText: "Private key used server-side for transaction verification & transfers.",
        required: true,
        isSecret: true,
      },
      {
        key: "webhook_secret",
        label: "Webhook Signing Secret",
        type: "secret",
        placeholder: "whsec_...",
        helperText: "HMAC signature secret to authenticate asynchronous payment webhooks.",
        required: false,
        isSecret: true,
      },
      {
        key: "dual_control_threshold",
        label: "Refund Dual-Control Threshold",
        type: "number",
        placeholder: "5000",
        helperText:
          "Refunds exceeding this amount require senior Bursar or Registrar approval.",
        defaultValue: "5000",
      },
      {
        key: "auto_reconciliation",
        label: "Automated Bank Webhook Reconciliation",
        type: "toggle",
        helperText:
          "Idempotently verify signed webhooks, update student invoices, and issue receipts.",
        defaultValue: true,
      },
    ],
  },
  {
    slug: "resend-email",
    name: "Resend Transactional Email Engine",
    category: "Communications",
    description:
      "High-deliverability official emails for offer letters, OTPs, announcements, and receipts.",
    docsHint:
      "Create a sending domain and scoped API key in Resend -> API Keys before switching to Live Mode.",
    webhookPath: "/api/webhooks/resend-inbound",
    fields: [
      {
        key: "api_key",
        label: "Resend API Key",
        type: "secret",
        placeholder: "re_...",
        helperText: "Server-side Resend API key with email sending permissions.",
        required: true,
        isSecret: true,
      },
      {
        key: "from_email",
        label: "Verified Sender Email",
        type: "email",
        placeholder: "noreply@yourdomain.edu",
        helperText: "Must belong to a domain verified in your Resend account.",
        required: true,
        defaultValue: "",
      },
      {
        key: "from_name",
        label: "Sender Display Name",
        type: "text",
        placeholder: "Erudian360 Notifications",
        helperText: "Display name shown in recipient email inboxes.",
        required: false,
        defaultValue: "Erudian360 Notifications",
      },
      {
        key: "reply_to",
        label: "Reply-To Email Address",
        type: "email",
        placeholder: "support@yourdomain.edu",
        helperText: "Optional inbox address routed to inbound communications.",
        required: false,
        defaultValue: "",
      },
      {
        key: "webhook_secret",
        label: "Inbound / Delivery Webhook Secret",
        type: "secret",
        placeholder: "whsec_...",
        helperText: "Used to verify Svix/Resend inbound email and bounce webhooks.",
        required: false,
        isSecret: true,
      },
    ],
  },
  {
    slug: "hubtel-sms",
    name: "Hubtel SMS Ghana",
    category: "Communications",
    description:
      "Direct carrier SMS for emergency campus notices, parent absence alerts, and admission updates.",
    docsHint:
      "Obtain your Hubtel Client ID, Client Secret, and approved alphanumeric Sender ID from Hubtel Unity.",
    fields: [
      {
        key: "client_id",
        label: "Hubtel Client ID",
        type: "text",
        placeholder: "Enter Hubtel Client ID",
        helperText: "API Client ID assigned to your institutional SMS account.",
        required: true,
        defaultValue: "",
      },
      {
        key: "client_secret",
        label: "Hubtel Client Secret",
        type: "secret",
        placeholder: "Enter Hubtel Client Secret",
        helperText: "Confidential Basic/Bearer credential for Hubtel SMS dispatch.",
        required: true,
        isSecret: true,
      },
      {
        key: "sender_id",
        label: "Approved Sender ID",
        type: "text",
        placeholder: "ERUDIAN360",
        helperText: "Up to 11 alphanumeric characters registered with local telecoms.",
        required: true,
        defaultValue: "",
      },
      {
        key: "api_url",
        label: "SMS Gateway Endpoint URL",
        type: "url",
        placeholder: "https://smsc.hubtel.com/v1/messages/send",
        helperText: "Override only if using a dedicated Hubtel proxy endpoint.",
        required: false,
        defaultValue: "https://smsc.hubtel.com/v1/messages/send",
      },
    ],
  },
  {
    slug: "quickbooks-erp",
    name: "External ERP / QuickBooks Financial Ledger",
    category: "Accounting",
    description:
      "Scheduled daily export of student fee collection, journal vouchers, and chart of accounts sync.",
    docsHint:
      "Register an OAuth 2.0 app in Intuit Developer Portal or point API URL to your institutional ERP connector.",
    webhookPath: "/api/webhooks/quickbooks-erp",
    fields: [
      {
        key: "api_url",
        label: "ERP / Accounting API Base URL",
        type: "url",
        placeholder: "https://quickbooks.api.intuit.com/v3",
        helperText: "Base endpoint URL for ledger journal and invoice synchronization.",
        required: true,
        defaultValue: "",
      },
      {
        key: "client_id",
        label: "OAuth Client ID / App Key",
        type: "text",
        placeholder: "AB123...",
        helperText: "Application client identifier issued by QuickBooks / ERP.",
        required: true,
        defaultValue: "",
      },
      {
        key: "client_secret",
        label: "OAuth Client Secret",
        type: "secret",
        placeholder: "Paste OAuth Client Secret",
        helperText: "Private secret used to refresh accounting API tokens securely.",
        required: true,
        isSecret: true,
      },
      {
        key: "webhook_secret",
        label: "Webhook Verifier Token",
        type: "secret",
        placeholder: "whsec_...",
        helperText: "Token used to validate ledger callback events.",
        required: false,
        isSecret: true,
      },
      {
        key: "sync_schedule",
        label: "Ledger Export Schedule",
        type: "select",
        required: false,
        defaultValue: "daily",
        options: [
          { value: "daily", label: "Daily Nightly Batch (00:00 UTC)" },
          { value: "hourly", label: "Hourly Incremental Sync" },
          { value: "manual", label: "Manual Bursar Trigger Only" },
        ],
        helperText: "Frequency for exporting approved fee receipts and fee schedules.",
      },
    ],
  },
];

export function getDefaultIntegrationBySlug(
  slug: string
): IntegrationDefinition | undefined {
  const normalized = String(slug || "").trim().toLowerCase();
  return DEFAULT_INTEGRATIONS.find((item) => item.slug === normalized);
}

/**
 * Masks sensitive API secrets for safe display in the browser (e.g. `••••••••1234`).
 */
export function maskSecretValue(raw?: string | null): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (value.length <= 4) return "••••••••";
  return `••••••••${value.slice(-4)}`;
}

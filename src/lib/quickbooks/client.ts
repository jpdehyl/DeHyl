// QuickBooks Online API Client
// https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice

const QB_API_BASE = "https://quickbooks.api.intuit.com";
const QB_SANDBOX_API_BASE = "https://sandbox-quickbooks.api.intuit.com";

interface QBConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: "sandbox" | "production";
}

type TokenRefreshCallback = (tokens: QBTokens) => Promise<void>;

export interface QBTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  realmId: string;
}

export class QuickBooksClient {
  private config: QBConfig;
  private tokens: QBTokens | null = null;
  private onTokenRefresh: TokenRefreshCallback | null = null;

  constructor(config?: Partial<QBConfig>) {
    this.config = {
      clientId: config?.clientId || process.env.QUICKBOOKS_CLIENT_ID!,
      clientSecret: config?.clientSecret || process.env.QUICKBOOKS_CLIENT_SECRET!,
      redirectUri: config?.redirectUri || process.env.QUICKBOOKS_REDIRECT_URI!,
      environment: config?.environment ||
        (process.env.QUICKBOOKS_ENVIRONMENT as "sandbox" | "production") ||
        (process.env.NODE_ENV === "production" ? "production" : "sandbox"),
    };
  }

  get apiBase() {
    return this.config.environment === "production"
      ? QB_API_BASE
      : QB_SANDBOX_API_BASE;
  }

  // Generate OAuth authorization URL
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: "com.intuit.quickbooks.accounting",
      state,
    });

    return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(
    code: string,
    realmId: string
  ): Promise<QBTokens> {
    const response = await fetch(
      "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${this.config.clientId}:${this.config.clientSecret}`
          ).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: this.config.redirectUri,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    const data = await response.json();

    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      realmId,
    };

    return this.tokens;
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<QBTokens> {
    const response = await fetch(
      "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${this.config.clientId}:${this.config.clientSecret}`
          ).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      // Check for invalid_grant which means the refresh token has expired or been revoked
      if (error.includes("invalid_grant")) {
        throw new Error(
          "QuickBooks session expired. Please reconnect QuickBooks in Settings."
        );
      }
      throw new Error(`Failed to refresh token: ${error}`);
    }

    const data = await response.json();

    this.tokens = {
      ...this.tokens!,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };

    // Persist refreshed tokens if callback is set
    if (this.onTokenRefresh) {
      await this.onTokenRefresh(this.tokens);
    }

    return this.tokens;
  }

  // Set tokens (e.g., from database)
  setTokens(tokens: QBTokens) {
    this.tokens = tokens;
  }

  // Set callback for when tokens are refreshed (for persistence)
  setOnTokenRefresh(callback: TokenRefreshCallback) {
    this.onTokenRefresh = callback;
  }

  // Make authenticated API request
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.tokens) {
      throw new Error("Not authenticated. Call setTokens() first.");
    }

    // Check if token needs refresh
    if (new Date() >= this.tokens.expiresAt) {
      await this.refreshAccessToken(this.tokens.refreshToken);
    }

    const response = await fetch(
      `${this.apiBase}/v3/company/${this.tokens.realmId}${endpoint}`,
      {
        ...options,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.tokens.accessToken}`,
          ...options.headers,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`QuickBooks API error: ${error}`);
    }

    return response.json();
  }

  // Query invoices with balance > 0 (open invoices)
  async getOpenInvoices() {
    const query = encodeURIComponent("SELECT * FROM Invoice WHERE Balance > '0'");
    const result = await this.apiRequest<{
      QueryResponse: { Invoice?: Array<Record<string, unknown>> };
    }>(`/query?query=${query}`);

    return result.QueryResponse.Invoice || [];
  }

  // Query all invoices (paginated) for full sync
  async getAllInvoices() {
    const allInvoices: Array<Record<string, unknown>> = [];
    let startPosition = 1;
    const maxResults = 1000;

    while (true) {
      const query = encodeURIComponent(
        `SELECT * FROM Invoice STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`
      );
      const result = await this.apiRequest<{
        QueryResponse: { Invoice?: Array<Record<string, unknown>>; maxResults?: number };
      }>(`/query?query=${query}`);

      const invoices = result.QueryResponse.Invoice || [];
      allInvoices.push(...invoices);

      if (invoices.length < maxResults) break;
      startPosition += maxResults;
    }

    return allInvoices;
  }

  // Query bills with balance > 0 (open bills)
  async getOpenBills() {
    const query = encodeURIComponent("SELECT * FROM Bill WHERE Balance > '0'");
    const result = await this.apiRequest<{
      QueryResponse: { Bill?: Array<Record<string, unknown>> };
    }>(`/query?query=${query}`);

    return result.QueryResponse.Bill || [];
  }

  // Query all bills (paginated) for full sync
  async getAllBills() {
    const allBills: Array<Record<string, unknown>> = [];
    let startPosition = 1;
    const maxResults = 1000;

    while (true) {
      const query = encodeURIComponent(
        `SELECT * FROM Bill STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`
      );
      const result = await this.apiRequest<{
        QueryResponse: { Bill?: Array<Record<string, unknown>>; maxResults?: number };
      }>(`/query?query=${query}`);

      const bills = result.QueryResponse.Bill || [];
      allBills.push(...bills);

      if (bills.length < maxResults) break;
      startPosition += maxResults;
    }

    return allBills;
  }

  // Get company info
  async getCompanyInfo() {
    const result = await this.apiRequest<{
      CompanyInfo: Record<string, unknown>;
    }>("/companyinfo/" + this.tokens?.realmId);

    return result.CompanyInfo;
  }
}

// Singleton instance
export const qbClient = new QuickBooksClient();

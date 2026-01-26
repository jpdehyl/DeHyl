// Google Drive API Client
// https://developers.google.com/drive/api/v3/reference

const GOOGLE_API_BASE = "https://www.googleapis.com/drive/v3";
const PROJECTS_FOLDER_ID =
  process.env.GOOGLE_DRIVE_PROJECTS_FOLDER_ID || "1qRGYL7NylTEkjjvoZStyjPWJyWR9fI6n";

interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  modifiedTime?: string;
}

export class GoogleDriveClient {
  private config: GoogleConfig;
  private tokens: GoogleTokens | null = null;

  constructor(config?: Partial<GoogleConfig>) {
    this.config = {
      clientId: config?.clientId || process.env.GOOGLE_CLIENT_ID!,
      clientSecret: config?.clientSecret || process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: config?.redirectUri || process.env.GOOGLE_REDIRECT_URI!,
    };
  }

  // Generate OAuth authorization URL
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/drive.readonly email profile",
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    const data = await response.json();

    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };

    return this.tokens;
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    const data = await response.json();

    this.tokens = {
      ...this.tokens!,
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };

    return this.tokens;
  }

  // Set tokens (e.g., from database)
  setTokens(tokens: GoogleTokens) {
    this.tokens = tokens;
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

    const response = await fetch(`${GOOGLE_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.tokens.accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Drive API error: ${error}`);
    }

    return response.json();
  }

  // Get user info (email)
  async getUserInfo(): Promise<{ email: string; name: string }> {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${this.tokens?.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get user info");
    }

    return response.json();
  }

  // List folders in the Projects directory
  async listProjectFolders(folderId: string = PROJECTS_FOLDER_ID): Promise<DriveFolder[]> {
    const query = encodeURIComponent(
      `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );

    const result = await this.apiRequest<{
      files: DriveFolder[];
    }>(`/files?q=${query}&fields=files(id,name,mimeType,parents,modifiedTime)&orderBy=modifiedTime desc`);

    return result.files || [];
  }

  // Get folder metadata
  async getFolder(folderId: string): Promise<DriveFolder> {
    return this.apiRequest<DriveFolder>(
      `/files/${folderId}?fields=id,name,mimeType,parents,modifiedTime`
    );
  }

  // Check if a folder contains an "Estimate" subfolder
  async hasEstimateFolder(folderId: string): Promise<boolean> {
    const query = encodeURIComponent(
      `'${folderId}' in parents and name = 'Estimate' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );

    const result = await this.apiRequest<{
      files: DriveFolder[];
    }>(`/files?q=${query}&fields=files(id)`);

    return (result.files?.length || 0) > 0;
  }

  // Check if a folder contains a "PBS" file
  async hasPBSFile(folderId: string): Promise<boolean> {
    const query = encodeURIComponent(
      `'${folderId}' in parents and name contains 'PBS' and trashed = false`
    );

    const result = await this.apiRequest<{
      files: DriveFolder[];
    }>(`/files?q=${query}&fields=files(id)`);

    return (result.files?.length || 0) > 0;
  }

  // Find estimate files or folders in a project folder
  // Returns the first matching file/folder ID, or null if none found
  async findEstimateFile(folderId: string): Promise<{ id: string; name: string; isFolder: boolean } | null> {
    // First, look for "Estimate" or "Estimates" subfolders
    const folderQuery = encodeURIComponent(
      `'${folderId}' in parents and (name = 'Estimate' or name = 'Estimates') and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );

    const folderResult = await this.apiRequest<{
      files: DriveFolder[];
    }>(`/files?q=${folderQuery}&fields=files(id,name,mimeType)`);

    if (folderResult.files && folderResult.files.length > 0) {
      return {
        id: folderResult.files[0].id,
        name: folderResult.files[0].name,
        isFolder: true,
      };
    }

    // If no folder found, look for files with "estimate" in the name (case insensitive)
    const fileQuery = encodeURIComponent(
      `'${folderId}' in parents and name contains 'estimate' and trashed = false`
    );

    const fileResult = await this.apiRequest<{
      files: DriveFolder[];
    }>(`/files?q=${fileQuery}&fields=files(id,name,mimeType)&orderBy=modifiedTime desc`);

    if (fileResult.files && fileResult.files.length > 0) {
      const file = fileResult.files[0];
      return {
        id: file.id,
        name: file.name,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder',
      };
    }

    return null;
  }
}

// Singleton instance
export const driveClient = new GoogleDriveClient();

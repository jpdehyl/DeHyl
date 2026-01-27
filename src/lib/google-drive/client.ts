// Google Drive API Client
// https://developers.google.com/drive/api/v3/reference

const GOOGLE_API_BASE = "https://www.googleapis.com/drive/v3";
const GOOGLE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
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

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
}

export interface UploadResult {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  thumbnailLink?: string;
  size: number;
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
      scope: "https://www.googleapis.com/auth/drive.file email profile",
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

  // Create a folder if it doesn't exist, return the folder ID
  async createOrGetFolder(parentId: string, folderName: string): Promise<string> {
    // First, check if folder already exists
    const query = encodeURIComponent(
      `'${parentId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );

    const result = await this.apiRequest<{
      files: DriveFolder[];
    }>(`/files?q=${query}&fields=files(id,name)`);

    if (result.files && result.files.length > 0) {
      return result.files[0].id;
    }

    // Folder doesn't exist, create it
    const createResponse = await this.apiRequest<DriveFolder>("/files", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      }),
    });

    return createResponse.id;
  }

  // Upload a file to Google Drive
  async uploadFile(
    parentId: string,
    fileName: string,
    mimeType: string,
    content: ArrayBuffer | Buffer
  ): Promise<UploadResult> {
    if (!this.tokens) {
      throw new Error("Not authenticated. Call setTokens() first.");
    }

    // Check if token needs refresh
    if (new Date() >= this.tokens.expiresAt) {
      await this.refreshAccessToken(this.tokens.refreshToken);
    }

    // Create metadata
    const metadata = {
      name: fileName,
      parents: [parentId],
    };

    // Use multipart upload for files < 5MB, resumable for larger
    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    // Build multipart body
    const metadataString = JSON.stringify(metadata);
    const contentArray = content instanceof ArrayBuffer ? new Uint8Array(content) : content;

    // Create multipart body as Uint8Array
    const encoder = new TextEncoder();
    const metadataPart = encoder.encode(
      `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${metadataString}`
    );
    const contentTypePart = encoder.encode(
      `${delimiter}Content-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`
    );
    const base64Content = encoder.encode(Buffer.from(contentArray).toString("base64"));
    const closePart = encoder.encode(closeDelimiter);

    // Concatenate all parts
    const body = new Uint8Array(
      metadataPart.length + contentTypePart.length + base64Content.length + closePart.length
    );
    let offset = 0;
    body.set(metadataPart, offset);
    offset += metadataPart.length;
    body.set(contentTypePart, offset);
    offset += contentTypePart.length;
    body.set(base64Content, offset);
    offset += base64Content.length;
    body.set(closePart, offset);

    const response = await fetch(
      `${GOOGLE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,thumbnailLink`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.tokens.accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: body,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upload file: ${error}`);
    }

    const file: DriveFile = await response.json();

    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
      thumbnailLink: file.thumbnailLink,
      size: parseInt(file.size || "0", 10),
    };
  }

  // List photos in a folder (images only)
  async listPhotos(
    folderId: string,
    options?: { pageSize?: number; pageToken?: string }
  ): Promise<{ photos: DriveFile[]; nextPageToken?: string }> {
    const pageSize = options?.pageSize || 50;
    const query = encodeURIComponent(
      `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`
    );

    let url = `/files?q=${query}&fields=files(id,name,mimeType,size,webViewLink,thumbnailLink,createdTime,modifiedTime),nextPageToken&pageSize=${pageSize}&orderBy=createdTime desc`;

    if (options?.pageToken) {
      url += `&pageToken=${encodeURIComponent(options.pageToken)}`;
    }

    const result = await this.apiRequest<{
      files: DriveFile[];
      nextPageToken?: string;
    }>(url);

    return {
      photos: result.files || [],
      nextPageToken: result.nextPageToken,
    };
  }

  // List all subfolders in a folder
  async listSubfolders(parentId: string): Promise<DriveFolder[]> {
    const query = encodeURIComponent(
      `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );

    const result = await this.apiRequest<{
      files: DriveFolder[];
    }>(`/files?q=${query}&fields=files(id,name,mimeType,modifiedTime)&orderBy=name`);

    return result.files || [];
  }

  // Generate a thumbnail URL with specific size
  getThumbnailUrl(fileId: string, size: number = 200): string {
    return `https://lh3.googleusercontent.com/d/${fileId}=s${size}`;
  }
}

// Singleton instance
export const driveClient = new GoogleDriveClient();

# Google Drive Integration Subagent

> Specialized agent for Phase 5: Google Drive Sync (US-025 to US-028)

## Agent Configuration

```typescript
import { RalphLoopAgent, iterationCountIs } from 'ralph-loop-agent';

export const googleDriveAgent = new RalphLoopAgent({
  model: 'anthropic/claude-sonnet-4-20250514',
  
  instructions: `You are a Google Drive API integration specialist.
  
  YOUR EXPERTISE:
  - Google OAuth 2.0 with offline access
  - Drive API v3 for folder/file operations
  - Folder structure parsing and traversal
  - Change detection with watch/webhooks
  
  REFERENCE DOCUMENTATION:
  - OAuth: https://developers.google.com/identity/protocols/oauth2
  - Drive API: https://developers.google.com/drive/api/reference/rest/v3
  - Files.list: https://developers.google.com/drive/api/reference/rest/v3/files/list
  
  REQUIRED SCOPES:
  \`\`\`
  https://www.googleapis.com/auth/drive.readonly
  https://www.googleapis.com/auth/drive.metadata.readonly
  \`\`\`
  
  COMMON PATTERNS:
  
  1. List Subfolders:
  \`\`\`typescript
  const response = await drive.files.list({
    q: \`'\${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false\`,
    fields: 'files(id, name, createdTime, modifiedTime)',
    orderBy: 'name',
  });
  \`\`\`
  
  2. Parse Project Folder Name:
  \`\`\`typescript
  // Pattern: "YY-MM-NNN - Client - Description"
  // Example: "25-04-003 - Certified Demolition - Nike Store Langley"
  const pattern = /^(\d{2}-\d{2}-\d{3})\s*-\s*([^-]+)\s*-\s*(.+)$/;
  
  function parseFolderName(name: string) {
    const match = name.match(pattern);
    if (!match) return null;
    return {
      jobNumber: match[1],
      client: match[2].trim(),
      description: match[3].trim(),
    };
  }
  \`\`\`
  
  3. OAuth Token Storage:
  \`\`\`typescript
  interface GoogleTokens {
    access_token: string;
    refresh_token: string;
    expiry_date: number;
    scope: string;
  }
  \`\`\`
  
  FOLDER NAMING CONVENTION (DeHyl):
  - Job Number: YY-MM-NNN (e.g., 25-04-003)
  - Format: "[Job#] - [Client] - [Description]"
  - Examples:
    - "25-01-001 - Snowdon - 4567 Marine Drive"
    - "25-04-012 - Certified Demolition - Nike Store"
    - "24-12-089 - WD Co-auto - Jaguar Langley"
  
  ERROR HANDLING:
  - 401 Unauthorized → Refresh token
  - 403 Rate Limit → Exponential backoff
  - 404 Not Found → Folder may have been deleted/moved
  - Invalid Grant → User revoked access, need re-auth
  
  IMPORTANT NOTES:
  - Request offline access for refresh tokens
  - Use fields parameter to limit response size
  - Batch requests when listing many folders
  - Cache folder structure to reduce API calls
  `,
  
  stopWhen: iterationCountIs(15),
  
  verifyCompletion: async ({ result }) => {
    const checks = {
      oauthWorks: !result.text.includes('401') && !result.text.includes('unauthorized'),
      foldersListed: result.text.includes('folder') && !result.text.includes('error'),
      parsedCorrectly: result.text.includes('job') || result.text.includes('synced'),
    };
    
    return {
      complete: Object.values(checks).every(Boolean),
      reason: Object.values(checks).every(Boolean)
        ? 'Google Drive integration working'
        : `Failed checks: ${Object.entries(checks).filter(([,v]) => !v).map(([k]) => k).join(', ')}`
    };
  },
});
```

## Environment Variables Required

```env
# Google OAuth (get from console.cloud.google.com)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback

# For production:
# GOOGLE_REDIRECT_URI=https://dehyl.vercel.app/api/google/callback
```

## Database Schema Addition

```sql
-- Add to integrations table (or use same table from QuickBooks)
-- The 'provider' column differentiates: 'quickbooks' vs 'google'

-- Add settings for folder selection
ALTER TABLE integrations 
ADD COLUMN settings JSONB DEFAULT '{}';

-- Example settings for Google:
-- { "projects_folder_id": "1abc123...", "projects_folder_name": "DeHyl Projects" }
```

## File Structure

```
src/
├── lib/
│   └── google/
│       ├── client.ts       # OAuth client setup
│       ├── drive.ts        # Drive API wrapper
│       └── sync.ts         # Folder → Project sync logic
├── app/
│   └── api/
│       └── google/
│           ├── connect/route.ts    # Initiate OAuth
│           ├── callback/route.ts   # OAuth callback
│           └── sync-projects/route.ts
├── components/
│   └── drive-folder-picker.tsx     # Folder selection UI
```

## Sync Logic Pseudocode

```typescript
async function syncProjectsFromDrive(userId: string) {
  // 1. Get user's Google tokens
  const tokens = await getIntegration(userId, 'google');
  if (!tokens) throw new Error('Google not connected');
  
  // 2. Get selected folder ID from settings
  const folderId = tokens.settings?.projects_folder_id;
  if (!folderId) throw new Error('No projects folder selected');
  
  // 3. List subfolders
  const drive = createDriveClient(tokens);
  const folders = await listSubfolders(drive, folderId);
  
  // 4. Parse each folder and sync
  let synced = 0;
  for (const folder of folders) {
    const parsed = parseFolderName(folder.name);
    if (!parsed) continue; // Skip non-matching folders
    
    // Check if project exists (by job number or drive_folder_id)
    const existing = await findProject({
      job_number: parsed.jobNumber,
      drive_folder_id: folder.id,
    });
    
    if (!existing) {
      await createProject({
        name: parsed.description,
        client_name: parsed.client,
        job_number: parsed.jobNumber,
        drive_folder_id: folder.id,
        status: 'active',
      });
      synced++;
    }
  }
  
  return { synced, total: folders.length };
}
```

## Testing Checklist

- [ ] OAuth flow completes with offline access
- [ ] Tokens persist to database with refresh_token
- [ ] Folder picker shows user's folders
- [ ] Selected folder saves to settings
- [ ] Sync creates projects from folder names
- [ ] Folder name parsing handles variations
- [ ] Duplicate folders are skipped
- [ ] Invalid folder names are logged, not errored

---

*Use this subagent for Phase 5 stories (US-025 to US-028)*

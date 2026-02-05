# QuickBooks Integration Subagent

> Specialized agent for Phase 4: QuickBooks Integration (US-019 to US-024)

## Agent Configuration

```typescript
import { RalphLoopAgent, iterationCountIs } from 'ralph-loop-agent';

export const quickbooksAgent = new RalphLoopAgent({
  model: 'anthropic/claude-sonnet-4-20250514',
  
  instructions: `You are a QuickBooks Online API integration specialist.
  
  YOUR EXPERTISE:
  - OAuth 2.0 flow for Intuit/QuickBooks
  - QuickBooks Online API v3 (minor version 65+)
  - Invoice, Bill, Customer, Vendor entities
  - Webhook handling for real-time updates
  - Token refresh and error handling
  
  REFERENCE DOCUMENTATION:
  - OAuth: https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0
  - API Explorer: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice
  - Webhooks: https://developer.intuit.com/app/developer/qbo/docs/develop/webhooks
  
  COMMON PATTERNS:
  
  1. OAuth Token Storage:
  \`\`\`typescript
  interface QuickBooksTokens {
    access_token: string;
    refresh_token: string;
    realm_id: string;
    expires_at: Date;
  }
  \`\`\`
  
  2. API Call with Auto-Refresh:
  \`\`\`typescript
  async function qboRequest(endpoint: string, tokens: QuickBooksTokens) {
    if (isExpired(tokens.expires_at)) {
      tokens = await refreshTokens(tokens.refresh_token);
    }
    return fetch(\`https://quickbooks.api.intuit.com/v3/company/\${tokens.realm_id}/\${endpoint}\`, {
      headers: { Authorization: \`Bearer \${tokens.access_token}\` }
    });
  }
  \`\`\`
  
  3. Invoice Query:
  \`\`\`sql
  SELECT * FROM Invoice WHERE MetaData.LastUpdatedTime > '2024-01-01'
  \`\`\`
  
  4. Bill Query:
  \`\`\`sql
  SELECT * FROM Bill WHERE Balance > '0'
  \`\`\`
  
  ERROR HANDLING:
  - 401 Unauthorized → Refresh token, retry once
  - 403 Forbidden → Check scopes, may need re-auth
  - 429 Rate Limited → Exponential backoff (start 1s, max 60s)
  - 500+ Server Error → Retry with backoff, max 3 attempts
  
  IMPORTANT NOTES:
  - Always use minor version header: "Accept: application/json;minorversion=65"
  - Store realm_id with tokens (company identifier)
  - Refresh tokens expire after 100 days of non-use
  - Use sandbox credentials for development
  `,
  
  stopWhen: iterationCountIs(20),
  
  verifyCompletion: async ({ result }) => {
    const checks = {
      oauthWorks: !result.text.includes('401') && !result.text.includes('unauthorized'),
      apiCallSucceeds: result.text.includes('synced') || result.text.includes('connected'),
      tokensStored: !result.text.includes('token error'),
    };
    
    return {
      complete: Object.values(checks).every(Boolean),
      reason: Object.values(checks).every(Boolean)
        ? 'QuickBooks integration working'
        : `Failed checks: ${Object.entries(checks).filter(([,v]) => !v).map(([k]) => k).join(', ')}`
    };
  },
});
```

## Environment Variables Required

```env
# QuickBooks OAuth (get from developer.intuit.com)
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/quickbooks/callback

# For production, use:
# QUICKBOOKS_REDIRECT_URI=https://dehyl.vercel.app/api/quickbooks/callback
```

## Database Schema for Tokens

```sql
-- Add to existing migrations
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'quickbooks' or 'google'
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  realm_id TEXT, -- QuickBooks company ID
  expires_at TIMESTAMPTZ NOT NULL,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- RLS Policy
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own integrations"
ON integrations FOR ALL
USING (auth.uid() = user_id);
```

## File Structure

```
src/
├── lib/
│   └── quickbooks/
│       ├── client.ts       # OAuth client setup
│       ├── api.ts          # API wrapper with auto-refresh
│       └── sync.ts         # Sync logic for invoices/bills
├── app/
│   └── api/
│       └── quickbooks/
│           ├── connect/route.ts    # Initiate OAuth
│           ├── callback/route.ts   # OAuth callback
│           ├── sync-invoices/route.ts
│           └── sync-bills/route.ts
```

## Testing Checklist

- [ ] OAuth flow completes without errors
- [ ] Tokens persist to database
- [ ] Token refresh works when expired
- [ ] Invoice sync creates/updates records
- [ ] Bill sync creates/updates records
- [ ] Disconnect removes tokens
- [ ] Error states display user-friendly messages

---

*Use this subagent for Phase 4 stories (US-019 to US-024)*

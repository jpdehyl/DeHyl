// Internal endpoint — returns QB tokens for trusted internal use
// Protected by INTERNAL_API_KEY env var
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-api-key')
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('oauth_tokens')
    .select('refresh_token, access_token, expires_at, realm_id')
    .eq('provider', 'quickbooks')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'No QB tokens found', details: error?.message }, { status: 404 })
  }

  return NextResponse.json({
    refresh_token: data.refresh_token,
    access_token:  data.access_token,
    expires_at:    data.expires_at,
    realm_id:      data.realm_id,
  })
}

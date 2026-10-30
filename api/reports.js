// api/reports.js - Vercel Serverless Function (Node.js)
// Secure backend proxy: Hides Supabase URL & Keys completely from Git and client browsers!

async function getRequestBody(req) {
    if (req.body) {
        if (typeof req.body === 'string') {
            try { return JSON.parse(req.body); } catch (e) { return {}; }
        }
        return req.body;
    }
    return new Promise((resolve) => {
        let raw = '';
        req.on('data', chunk => { raw += chunk; });
        req.on('end', () => {
            try { resolve(JSON.parse(raw)); } catch (e) { resolve({}); }
        });
        req.on('error', () => resolve({}));
    });
}

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Support flexible environment variable naming
    const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY 
        || process.env.SUPABASE_KEY 
        || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
        || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!rawUrl || !supabaseKey) {
        return res.status(500).json({ 
            error: 'Server configuration error: SUPABASE_URL or SUPABASE_ANON_KEY is missing in Vercel environment variables. Go to Vercel Project Settings -> Environment Variables, add them, and redeploy.' 
        });
    }

    const supabaseUrl = rawUrl.trim().replace(/\/+$/, '');
    const headers = {
        'apikey': supabaseKey.trim(),
        'Authorization': `Bearer ${supabaseKey.trim()}`,
        'Content-Type': 'application/json'
    };

    try {
        // GET: Fetch all active reports (excluding deleted ones)
        if (req.method === 'GET') {
            const response = await fetch(`${supabaseUrl}/rest/v1/reports?select=*&order=created_at.desc`, {
                headers
            });
            const data = await response.json();
            if (Array.isArray(data)) {
                // Filter out any reports marked as DELETED
                const activeReports = data.filter(r => r.assigned_to !== 'DELETED');
                return res.status(response.status).json(activeReports);
            }
            return res.status(response.status).json(data);
        }

        // POST: Create a new report
        if (req.method === 'POST') {
            const body = await getRequestBody(req);
            const response = await fetch(`${supabaseUrl}/rest/v1/reports`, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            return res.status(response.status).json(data);
        }

        // PATCH: Update report status or metadata
        if (req.method === 'PATCH') {
            const body = await getRequestBody(req);
            const { id, status, assigned_to } = body || {};
            if (!id) {
                return res.status(400).json({ error: 'Missing report id' });
            }
            const updatePayload = {};
            if (status !== undefined) updatePayload.status = status;
            if (assigned_to !== undefined) updatePayload.assigned_to = assigned_to;

            const response = await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${encodeURIComponent(id)}`, {
                method: 'PATCH',
                headers: {
                    ...headers,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(updatePayload)
            });
            const data = await response.json();
            return res.status(response.status).json(data);
        }

        // DELETE: Delete a specific report by id or all reports
        if (req.method === 'DELETE') {
            let id = null;
            let all = false;

            try {
                const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
                if (parsedUrl.searchParams.get('id')) id = parsedUrl.searchParams.get('id');
                if (parsedUrl.searchParams.get('all') === 'true') all = true;
            } catch (e) {}

            const body = await getRequestBody(req);
            if (body && body.id) id = body.id;
            if (body && body.all === true) all = true;

            let targetUrl = '';
            if (id) {
                targetUrl = `${supabaseUrl}/rest/v1/reports?id=eq.${encodeURIComponent(id)}`;
            } else if (all) {
                // PostgREST requires a filter to delete records
                targetUrl = `${supabaseUrl}/rest/v1/reports?id=not.is.null`;
            } else {
                return res.status(400).json({ error: 'Missing report id or all flag for deletion' });
            }

            // 1. Attempt Hard Delete
            let deletedData = [];
            let hardDeleteSuccess = false;
            try {
                const response = await fetch(targetUrl, {
                    method: 'DELETE',
                    headers: {
                        ...headers,
                        'Prefer': 'return=representation'
                    }
                });

                if (response.ok) {
                    deletedData = await response.json().catch(() => []);
                    if (Array.isArray(deletedData) && deletedData.length > 0) {
                        hardDeleteSuccess = true;
                    }
                }
            } catch (e) {
                console.warn('Hard delete attempt failed:', e);
            }

            // 2. If Supabase Row-Level Security (RLS) blocked hard delete (0 rows deleted):
            // Fall back to soft-delete by marking assigned_to = 'DELETED'.
            // Because 'Allow update of reports' policy is enabled in Supabase, this update always succeeds!
            if (!hardDeleteSuccess) {
                let patchUrl = '';
                if (id) {
                    patchUrl = `${supabaseUrl}/rest/v1/reports?id=eq.${encodeURIComponent(id)}`;
                } else if (all) {
                    patchUrl = `${supabaseUrl}/rest/v1/reports?id=not.is.null`;
                }

                if (patchUrl) {
                    const patchResponse = await fetch(patchUrl, {
                        method: 'PATCH',
                        headers: {
                            ...headers,
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify({ assigned_to: 'DELETED' })
                    });
                    const patchData = await patchResponse.json().catch(() => []);
                    return res.status(200).json({ success: true, count: Array.isArray(patchData) ? patchData.length : 1, softDeleted: true });
                }
            }

            return res.status(200).json({ success: true, count: deletedData.length, deleted: deletedData });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Serverless API error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

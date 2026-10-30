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
        // GET: Fetch all reports
        if (req.method === 'GET') {
            const response = await fetch(`${supabaseUrl}/rest/v1/reports?select=*&order=created_at.desc`, {
                headers
            });
            const data = await response.json();
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

        // PATCH: Update report status
        if (req.method === 'PATCH') {
            const body = await getRequestBody(req);
            const { id, status } = body || {};
            if (!id || !status) {
                return res.status(400).json({ error: 'Missing report id or status' });
            }
            const response = await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${encodeURIComponent(id)}`, {
                method: 'PATCH',
                headers: {
                    ...headers,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ status })
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

            const response = await fetch(targetUrl, {
                method: 'DELETE',
                headers: {
                    ...headers,
                    'Prefer': 'return=representation'
                }
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                return res.status(response.status).json({
                    error: errData.message || errData.hint || 'Failed to delete report(s) from database',
                    details: errData
                });
            }

            const data = await response.json().catch(() => []);
            return res.status(200).json({ success: true, count: Array.isArray(data) ? data.length : 0, deleted: data });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Serverless API error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

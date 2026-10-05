// api/reports.js - Vercel Serverless Function (Node.js)
// Secure backend proxy: Hides Supabase URL & Keys completely from Git and client browsers!

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ 
            error: 'Server configuration error: SUPABASE_URL or SUPABASE_ANON_KEY is missing in Vercel environment variables.' 
        });
    }

    const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
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
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (e) {}
            }
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
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (e) {}
            }
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

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Serverless API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

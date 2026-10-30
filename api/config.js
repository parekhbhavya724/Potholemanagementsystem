// api/config.js - Vercel Serverless Function
// Provides public client configurations securely from Vercel Environment Variables
// Keeps sensitive keys out of Git repositories

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Read from Vercel encrypted environment variables
    const googleClientId = process.env.GOOGLE_CLIENT_ID 
                        || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID 
                        || '';

    return res.status(200).json({
        googleClientId
    });
};

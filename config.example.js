// Example configuration template
// 1. Copy this file and rename it to 'config.js':
//    copy config.example.js config.js
// 2. Add your keys below.
// 3. 'config.js' is listed in .gitignore, so your keys will NEVER be committed to Git.

window.APP_CONFIG = {
    // Optional: Google Maps API Key (leave empty to use 100% Free OpenStreetMap)
    GOOGLE_MAPS_API_KEY: "",

    // Supabase Cloud Backend (PostgreSQL database)
    // Get these for free from https://supabase.com -> Project Settings -> API
    SUPABASE_URL: "",      // e.g. 'https://xyzabcdef.supabase.co'
    SUPABASE_ANON_KEY: ""  // e.g. 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};

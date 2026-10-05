# Pothole Management System (PotholeFix)

A web-based portal for reporting, tracking, and managing road potholes for citizens and authorities.

## Features
- **Interactive Map & Auto-Address Geocoding**: Click any point on the map or drag the pin to automatically capture high-precision GPS coordinates and auto-fill the full street address using Google Maps & Geocoding API (with zero-config OpenStreetMap fallback).
- **GPS Location Detection**: Quick "Use Current GPS" button to center the map and detect the device's location instantly.
- **Citizen Portal**: Report potholes with photo upload & preview, severity levels, dimensions, and descriptions.
- **Report Tracking**: Monitor real-time status of reported issues with direct links to view potholes on Google Maps.
- **Authority / Admin Dashboard**: View all reported potholes, manage status updates, and track repair progress.
- **Authentication**: Built-in citizen and authority login & registration with role-based access control.

## Deployment & Backend Configuration

Deploy directly to **Vercel**:
1. Connect this GitHub repository to Vercel.
2. In **Vercel Project Settings &rarr; Environment Variables**, add your Supabase credentials:
   - `SUPABASE_URL`: `https://<your-project-ref>.supabase.co`
   - `SUPABASE_ANON_KEY`: `eyJhbGciOiJI...`
3. Vercel securely encrypts these environment variables on the server. The serverless proxy at `/api/reports` routes all database queries securely so credentials are **100% hidden** from Git, public repositories, and client browser DevTools.

## Database Setup
Run the SQL queries in `supabase_schema.sql` inside your Supabase project's **SQL Editor** to create the `reports` table with real-time replication.


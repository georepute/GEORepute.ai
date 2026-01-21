/**
 * Google Search Console OAuth - Initiate Authentication
 * Redirects user to Google OAuth consent screen
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

/**
 * GET - Initiate OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: [
        'https://www.googleapis.com/auth/webmasters.readonly',
        'https://www.googleapis.com/auth/siteverification', // Required for domain verification
        'https://www.googleapis.com/auth/webmasters', // Required for adding sites to GSC
      ],
      prompt: 'consent', // Force consent screen to always get refresh token
    });

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('GSC auth initiation error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

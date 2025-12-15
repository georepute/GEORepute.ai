/**
 * API Route Example: Domain Verification Endpoints
 * 
 * This file shows how to integrate the Site Verification API
 * into your Next.js API routes or Express.js backend.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleSearchConsoleClient, GSCTokens } from '@/lib/integrations/google-search-console';

// Types for request/response
interface StartVerificationRequest {
  domain: string;
  method: 'DNS_TXT' | 'DNS_CNAME';
}

interface StartVerificationResponse {
  success: boolean;
  token?: string;
  instructions?: {
    type: string;
    host: string;
    recordType: string;
    value: string;
    ttl: number;
  };
  error?: string;
}

interface CheckVerificationRequest {
  domain: string;
  method: 'DNS_TXT' | 'DNS_CNAME';
}

interface CheckVerificationResponse {
  success: boolean;
  verified?: boolean;
  addedToSearchConsole?: boolean;
  error?: string;
  message?: string;
}

// Helper to get client with user credentials
function getClientForUser(userId: string): GoogleSearchConsoleClient {
  const client = new GoogleSearchConsoleClient({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  });

  // Fetch user's tokens from database
  // This is a placeholder - implement your actual token retrieval
  const userTokens = getUserTokensFromDatabase(userId);
  client.setCredentials(userTokens);

  return client;
}

// Placeholder for database operations
function getUserTokensFromDatabase(userId: string): GSCTokens {
  // TODO: Implement actual database query
  throw new Error('Not implemented');
}

async function saveVerificationToken(userId: string, domain: string, token: string, method: string) {
  // TODO: Implement database save
  // Example SQL:
  // INSERT INTO domain_verifications (user_id, domain, token, method, status, created_at)
  // VALUES ($1, $2, $3, $4, 'pending', NOW())
  console.log('Saving verification token:', { userId, domain, token, method });
}

async function updateVerificationStatus(userId: string, domain: string, verified: boolean) {
  // TODO: Implement database update
  // Example SQL:
  // UPDATE domain_verifications
  // SET status = 'verified', verified_at = NOW()
  // WHERE user_id = $1 AND domain = $2
  console.log('Updating verification status:', { userId, domain, verified });
}

/**
 * API Route: POST /api/domain/verify/start
 * 
 * Initiates the domain verification process by requesting a token
 */
async function startDomainVerification(
  req: NextApiRequest,
  res: NextApiResponse<StartVerificationResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get user ID from session/JWT
    const userId = req.headers['x-user-id'] as string; // Adjust based on your auth
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { domain, method = 'DNS_TXT' }: StartVerificationRequest = req.body;

    if (!domain) {
      return res.status(400).json({ success: false, error: 'Domain is required' });
    }

    // Validate domain format
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ success: false, error: 'Invalid domain format' });
    }

    // Initialize client with user's credentials
    const client = getClientForUser(userId);

    // Request verification token
    console.log(`Requesting ${method} verification token for ${domain}`);
    const token = await client.getVerificationToken(domain, method);

    // Save token to database
    await saveVerificationToken(userId, domain, token, method);

    // Return instructions to user
    return res.status(200).json({
      success: true,
      token,
      instructions: {
        type: method,
        host: method === 'DNS_TXT' ? '@' : domain,
        recordType: method === 'DNS_TXT' ? 'TXT' : 'CNAME',
        value: token,
        ttl: 3600,
      },
    });

  } catch (error: any) {
    console.error('Error starting verification:', error);
    
    // Handle specific errors
    if (error.code === 403) {
      return res.status(403).json({
        success: false,
        error: 'Missing permissions. Please re-authenticate.',
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to start verification',
    });
  }
}

/**
 * API Route: POST /api/domain/verify/check
 * 
 * Checks if the DNS record is in place and verifies the domain
 */
async function checkDomainVerification(
  req: NextApiRequest,
  res: NextApiResponse<CheckVerificationResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { domain, method = 'DNS_TXT' }: CheckVerificationRequest = req.body;

    if (!domain) {
      return res.status(400).json({ success: false, error: 'Domain is required' });
    }

    const client = getClientForUser(userId);

    // Attempt verification
    console.log(`Verifying ${domain} with ${method}`);
    const verificationResult = await client.verifySite(domain, method);

    // Update database
    await updateVerificationStatus(userId, domain, true);

    // Try to add to Search Console
    let addedToSearchConsole = false;
    try {
      await client.addSite(`sc-domain:${domain}`);
      addedToSearchConsole = true;
      console.log(`Added ${domain} to Search Console`);
    } catch (addError: any) {
      // Might already be added, that's okay
      console.log('Could not add to Search Console:', addError.message);
    }

    return res.status(200).json({
      success: true,
      verified: true,
      addedToSearchConsole,
      message: 'Domain verified successfully!',
    });

  } catch (error: any) {
    console.error('Error verifying domain:', error);

    // DNS record not found
    if (error.code === 404) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: 'DNS record not found. Please ensure the record is added and wait for DNS propagation (can take up to 48 hours).',
      });
    }

    // Other errors
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify domain',
    });
  }
}

/**
 * API Route: GET /api/domain/verify/status/:domain
 * 
 * Gets the current verification status from database
 */
async function getVerificationStatus(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { domain } = req.query;

    // TODO: Query database for verification status
    // const status = await getVerificationFromDatabase(userId, domain);

    return res.status(200).json({
      success: true,
      domain,
      status: 'pending', // or 'verified'
      token: 'google-site-verification=...',
      method: 'DNS_TXT',
      createdAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Error getting verification status:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * API Route: POST /api/domain/verify/retry
 * 
 * Retries verification with exponential backoff
 */
async function retryVerification(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { domain, method = 'DNS_TXT', maxRetries = 3 } = req.body;

    const client = getClientForUser(userId);

    // Retry with exponential backoff
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`Verification attempt ${attempt + 1}/${maxRetries} for ${domain}`);
        
        const result = await client.verifySite(domain, method);
        await updateVerificationStatus(userId, domain, true);

        // Success!
        return res.status(200).json({
          success: true,
          verified: true,
          attempts: attempt + 1,
          message: 'Domain verified successfully!',
        });

      } catch (error: any) {
        if (error.code === 404 && attempt < maxRetries - 1) {
          // DNS not found, wait and retry
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`DNS not found, waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error; // Other errors or last attempt
        }
      }
    }

    // All retries failed
    return res.status(404).json({
      success: false,
      verified: false,
      message: 'DNS record not found after multiple attempts. Please check your DNS configuration.',
    });

  } catch (error: any) {
    console.error('Error retrying verification:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Express.js Example (if not using Next.js)
 */
/*
import express from 'express';

const router = express.Router();

router.post('/api/domain/verify/start', async (req, res) => {
  try {
    const { userId } = req.user; // From auth middleware
    const { domain, method } = req.body;

    const client = getClientForUser(userId);
    const token = await client.getVerificationToken(domain, method);
    await saveVerificationToken(userId, domain, token, method);

    res.json({
      success: true,
      token,
      instructions: {
        type: method,
        host: '@',
        recordType: 'TXT',
        value: token,
        ttl: 3600,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/domain/verify/check', async (req, res) => {
  try {
    const { userId } = req.user;
    const { domain, method } = req.body;

    const client = getClientForUser(userId);
    await client.verifySite(domain, method);
    await updateVerificationStatus(userId, domain, true);

    res.json({
      success: true,
      verified: true,
      message: 'Domain verified successfully!',
    });
  } catch (error) {
    if (error.code === 404) {
      res.status(404).json({
        success: false,
        verified: false,
        message: 'DNS record not found.',
      });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

export default router;
*/

/**
 * Frontend React Component Example
 */
/*
'use client';

import { useState } from 'react';

export function DomainVerification() {
  const [domain, setDomain] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'requesting' | 'pending' | 'verifying' | 'verified'>('idle');
  const [error, setError] = useState('');

  const startVerification = async () => {
    setStatus('requesting');
    setError('');

    try {
      const response = await fetch('/api/domain/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, method: 'DNS_TXT' }),
      });

      const data = await response.json();

      if (data.success) {
        setToken(data.token);
        setStatus('pending');
      } else {
        setError(data.error);
        setStatus('idle');
      }
    } catch (err) {
      setError('Failed to start verification');
      setStatus('idle');
    }
  };

  const checkVerification = async () => {
    setStatus('verifying');
    setError('');

    try {
      const response = await fetch('/api/domain/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, method: 'DNS_TXT' }),
      });

      const data = await response.json();

      if (data.success && data.verified) {
        setStatus('verified');
      } else {
        setError(data.message || 'Verification failed');
        setStatus('pending');
      }
    } catch (err) {
      setError('Failed to verify domain');
      setStatus('pending');
    }
  };

  return (
    <div className="space-y-4">
      <h2>Verify Your Domain</h2>

      {status === 'idle' && (
        <div>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            className="border p-2 rounded"
          />
          <button onClick={startVerification} className="ml-2 bg-blue-500 text-white px-4 py-2 rounded">
            Start Verification
          </button>
        </div>
      )}

      {status === 'pending' && (
        <div className="border p-4 rounded">
          <h3>Add DNS Record</h3>
          <p>Add this TXT record to your DNS:</p>
          <div className="bg-gray-100 p-3 rounded mt-2 font-mono text-sm">
            <div>Type: TXT</div>
            <div>Host: @ or {domain}</div>
            <div>Value: {token}</div>
            <div>TTL: 3600</div>
          </div>
          <button onClick={checkVerification} className="mt-4 bg-green-500 text-white px-4 py-2 rounded">
            Verify DNS Record
          </button>
        </div>
      )}

      {status === 'verified' && (
        <div className="bg-green-100 border border-green-400 text-green-700 p-4 rounded">
          ✅ Domain verified successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded">
          {error}
        </div>
      )}

      {(status === 'requesting' || status === 'verifying') && (
        <div>Loading...</div>
      )}
    </div>
  );
}
*/

export {
  startDomainVerification,
  checkDomainVerification,
  getVerificationStatus,
  retryVerification,
};


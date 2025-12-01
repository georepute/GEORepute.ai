/**
 * Email Service
 * Handles sending emails via Gmail SMTP
 */

import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  // Gmail SMTP configuration
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular password
    },
  });

  return transporter;
}

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate environment variables
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('Gmail credentials not configured');
      return {
        success: false,
        error: 'Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.',
      };
    }

    const emailTransporter = getTransporter();

    // Verify connection
    await emailTransporter.verify();

    // Send email
    const info = await emailTransporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'GeoRepute.ai'}" <${process.env.GMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    });

    console.log('Email sent successfully:', info.messageId);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

/**
 * Send report email
 */
export async function sendReportEmail(
  email: string,
  userName: string,
  reportData: {
    dateRange: string;
    totalKeywords: number;
    avgRanking: number;
    totalContent: number;
    publishedContent: number;
    avgVisibilityScore: number;
    totalMentions: number;
    topKeywords: Array<{ keyword: string; ranking: number; volume: number }>;
    visibilityByPlatform: Array<{ platform: string; score: number; mentions: number }>;
  },
  reportId?: string | null
): Promise<{ success: boolean; error?: string }> {
  const subject = `Your GeoRepute.ai Performance Report - ${reportData.dateRange}`;

  const publicReportUrl = reportId 
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/public/report/${reportId}`
    : null;

  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/reports`;
  const primaryUrl = publicReportUrl || dashboardUrl;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Performance Report</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 32px;">📊 Performance Report</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${reportData.dateRange} Analysis</p>
      </div>
      
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e0e0e0; border-top: none;">
        <p style="font-size: 16px; margin-bottom: 30px;">
          Hi ${userName},
        </p>
        
        <p style="font-size: 16px; margin-bottom: 30px;">
          Here's your comprehensive performance report for the selected period. This report includes key metrics across Keywords, Content, and AI Visibility.
        </p>
        
        <!-- Key Metrics Summary -->
        <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); padding: 25px; border-radius: 10px; margin-bottom: 30px;">
          <h2 style="color: #667eea; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">📈 Key Metrics Overview</h2>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px;">
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="color: #667eea; font-size: 14px; font-weight: 600; margin-bottom: 8px;">Total Keywords</div>
              <div style="font-size: 32px; font-weight: bold; color: #1f2937;">${reportData.totalKeywords}</div>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="color: #8b5cf6; font-size: 14px; font-weight: 600; margin-bottom: 8px;">Avg Ranking</div>
              <div style="font-size: 32px; font-weight: bold; color: #1f2937;">${reportData.avgRanking.toFixed(1)}</div>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="color: #10b981; font-size: 14px; font-weight: 600; margin-bottom: 8px;">Total Content</div>
              <div style="font-size: 32px; font-weight: bold; color: #1f2937;">${reportData.totalContent}</div>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="color: #f59e0b; font-size: 14px; font-weight: 600; margin-bottom: 8px;">Published</div>
              <div style="font-size: 32px; font-weight: bold; color: #1f2937;">${reportData.publishedContent}</div>
            </div>
          </div>
        </div>

        <!-- AI Visibility -->
        <div style="background: #f8fafc; padding: 25px; border-radius: 10px; margin-bottom: 30px;">
          <h2 style="color: #0ea5e9; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px;">🤖 AI Visibility Performance</h2>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px;">
            <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #0ea5e9;">
              <div style="color: #64748b; font-size: 13px; margin-bottom: 5px;">Visibility Score</div>
              <div style="font-size: 28px; font-weight: bold; color: #0ea5e9;">${reportData.avgVisibilityScore.toFixed(1)}%</div>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #06b6d4;">
              <div style="color: #64748b; font-size: 13px; margin-bottom: 5px;">Total Mentions</div>
              <div style="font-size: 28px; font-weight: bold; color: #06b6d4;">${reportData.totalMentions}</div>
            </div>
          </div>

          ${reportData.visibilityByPlatform.length > 0 ? `
          <div style="margin-top: 20px;">
            <h3 style="color: #334155; font-size: 16px; margin-bottom: 15px;">Platform Breakdown</h3>
            ${reportData.visibilityByPlatform.slice(0, 5).map((platform) => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; margin-bottom: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <div style="font-weight: 600; color: #334155; text-transform: capitalize;">${platform.platform}</div>
                <div style="display: flex; gap: 20px; align-items: center;">
                  <div style="text-align: right;">
                    <div style="font-size: 12px; color: #64748b;">Score</div>
                    <div style="font-weight: bold; color: #0ea5e9;">${platform.score.toFixed(1)}%</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 12px; color: #64748b;">Mentions</div>
                    <div style="font-weight: bold; color: #06b6d4;">${platform.mentions}</div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          ` : ''}
        </div>

        <!-- Top Keywords -->
        ${reportData.topKeywords.length > 0 ? `
        <div style="background: #fefce8; padding: 25px; border-radius: 10px; margin-bottom: 30px;">
          <h2 style="color: #f59e0b; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">🔑 Top Keywords</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: white;">
                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 13px;">Keyword</th>
                <th style="text-align: center; padding: 12px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 13px;">Ranking</th>
                <th style="text-align: center; padding: 12px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 13px;">Volume</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.topKeywords.slice(0, 10).map((kw, idx) => `
                <tr style="background: ${idx % 2 === 0 ? 'white' : '#fffbeb'};">
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500; color: #334155;">${kw.keyword}</td>
                  <td style="text-align: center; padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #f59e0b;">${kw.ranking.toFixed(1)}</td>
                  <td style="text-align: center; padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${kw.volume.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Call to Action -->
        <div style="text-align: center; margin: 40px 0 30px 0;">
          <a href="${primaryUrl}" 
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 48px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
            ${publicReportUrl ? 'View Public Report' : 'View Full Report'}
          </a>
        </div>
        
        ${publicReportUrl ? `
        <p style="font-size: 14px; color: #666; text-align: center; margin-top: 20px;">
          Or copy and paste this link to share with others:
        </p>
        <p style="font-size: 12px; color: #999; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 5px; text-align: center;">
          ${publicReportUrl}
        </p>
        ` : ''}
        
        <p style="font-size: 14px; color: #666; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          This is an automated report generated by GeoRepute.ai. ${publicReportUrl ? 'This report is publicly accessible via the link above and will remain available.' : 'For detailed insights and interactive charts, please visit your dashboard.'}
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          Best regards,<br>
          The GeoRepute.ai Team
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; padding: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} GeoRepute.ai. All rights reserved.</p>
        <p style="margin-top: 10px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/privacy" style="color: #667eea; text-decoration: none;">Privacy Policy</a>
        </p>
      </div>
    </body>
    </html>
  `;

  // Use EMAIL_FROM_NAME_REPORT if available, otherwise fall back to default
  const fromName = process.env.EMAIL_FROM_NAME_REPORT || process.env.EMAIL_FROM_NAME || 'GeoRepute.ai Reports';
  
  // Send email with custom from name for reports
  try {
    const emailTransporter = getTransporter();
    await emailTransporter.verify();

    const info = await emailTransporter.sendMail({
      from: `"${fromName}" <${process.env.GMAIL_USER}>`,
      to: email,
      subject,
      html,
    });

    console.log('Report email sent successfully:', info.messageId);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending report email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send report email',
    };
  }
}

/**
 * Send organization invitation email
 */
export async function sendInvitationEmail(
  email: string,
  inviterName: string,
  organizationName: string,
  invitationLink: string,
  roleName: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `You've been invited to join ${organizationName} on GeoRepute.ai`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Organization Invitation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
      </div>
      
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
          Hi there,
        </p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on GeoRepute.ai as a <strong>${roleName}</strong>.
        </p>
        
        <p style="font-size: 16px; margin-bottom: 30px;">
          Click the button below to accept the invitation and start collaborating:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationLink}" 
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
            Accept Invitation
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          Or copy and paste this link into your browser:
        </p>
        <p style="font-size: 12px; color: #999; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 5px;">
          ${invitationLink}
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          Best regards,<br>
          The GeoRepute.ai Team
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; padding: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} GeoRepute.ai. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject,
    html,
  });
}

/**
 * Send welcome email after invitation acceptance
 */
export async function sendWelcomeEmail(
  email: string,
  userName: string,
  organizationName: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Welcome to ${organizationName} on GeoRepute.ai`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to GeoRepute.ai</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome Aboard!</h1>
      </div>
      
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
          Hi ${userName},
        </p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Welcome to <strong>${organizationName}</strong> on GeoRepute.ai!
        </p>
        
        <p style="font-size: 16px; margin-bottom: 30px;">
          You've successfully joined the organization. You can now access your dashboard and start collaborating with your team.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
            Go to Dashboard
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          If you have any questions, feel free to reach out to your organization admin.
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          Best regards,<br>
          The GeoRepute.ai Team
        </p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject,
    html,
  });
}


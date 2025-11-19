"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Eye, FileText, Mail, Calendar } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-6">
              <Shield className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Privacy Policy
            </h1>
            <p className="text-lg text-gray-600">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content Section */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl p-8 md:p-12"
          >
            <div className="prose prose-lg max-w-none">
              
              {/* Introduction */}
              <div className="mb-12">
                <p className="text-gray-700 leading-relaxed mb-4">
                  At <strong>GeoRepute.ai</strong> ("we," "our," or "us"), we are committed to protecting your privacy. 
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you 
                  use our website and services (collectively, the "Service").
                </p>
                <p className="text-gray-700 leading-relaxed">
                  By using our Service, you agree to the collection and use of information in accordance with this policy. 
                  If you do not agree with our policies and practices, please do not use our Service.
                </p>
              </div>

              {/* Information We Collect */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <FileText className="w-6 h-6 text-primary-600" />
                  <h2 className="text-2xl font-bold text-gray-900">1. Information We Collect</h2>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">1.1 Information You Provide</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li><strong>Account Information:</strong> Name, email address, password, and profile information</li>
                  <li><strong>Content Data:</strong> Keywords, content strategies, generated content, and publishing preferences</li>
                  <li><strong>Business Information:</strong> Company name, industry, website URL, and business goals</li>
                  <li><strong>Payment Information:</strong> Billing address and payment method details (processed securely through third-party payment processors)</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">1.2 Automatically Collected Information</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li><strong>Usage Data:</strong> Pages visited, features used, time spent, and interaction patterns</li>
                  <li><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers</li>
                  <li><strong>Cookies and Tracking:</strong> We use cookies and similar tracking technologies to enhance your experience</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">1.3 Third-Party Integrations</h3>
                <p className="text-gray-700 mb-3">
                  When you connect third-party services, we may collect:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li><strong>Social Media Platforms:</strong> Access tokens and profile information from LinkedIn, Facebook, GitHub, Reddit, Medium, and Quora</li>
                  <li><strong>Analytics Services:</strong> Data from Google Analytics, Google Search Console, and other analytics platforms</li>
                  <li><strong>AI Platforms:</strong> API keys and usage data for OpenAI, Claude, Gemini, Perplexity, and Groq</li>
                </ul>
              </div>

              {/* How We Use Information */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Eye className="w-6 h-6 text-primary-600" />
                  <h2 className="text-2xl font-bold text-gray-900">2. How We Use Your Information</h2>
                </div>
                
                <p className="text-gray-700 mb-4">We use the collected information for the following purposes:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>To provide, maintain, and improve our Service</li>
                  <li>To process your transactions and manage your account</li>
                  <li>To generate AI-powered content, forecasts, and recommendations</li>
                  <li>To publish content to connected social media platforms on your behalf</li>
                  <li>To send you updates, newsletters, and marketing communications (with your consent)</li>
                  <li>To respond to your inquiries and provide customer support</li>
                  <li>To detect, prevent, and address technical issues and security threats</li>
                  <li>To comply with legal obligations and enforce our terms of service</li>
                  <li>To analyze usage patterns and improve user experience</li>
                </ul>
              </div>

              {/* Data Sharing */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Lock className="w-6 h-6 text-primary-600" />
                  <h2 className="text-2xl font-bold text-gray-900">3. Data Sharing and Disclosure</h2>
                </div>
                
                <p className="text-gray-700 mb-4">We do not sell your personal information. We may share your information in the following circumstances:</p>
                
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.1 Service Providers</h3>
                <p className="text-gray-700 mb-3">
                  We may share information with third-party service providers who perform services on our behalf:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li><strong>Supabase:</strong> Database hosting and authentication services</li>
                  <li><strong>OpenAI, Anthropic, Google, Perplexity, Groq:</strong> AI content generation and analysis</li>
                  <li><strong>Vercel:</strong> Hosting and deployment services</li>
                  <li><strong>Payment Processors:</strong> Secure payment processing (Stripe, PayPal, etc.)</li>
                  <li><strong>Email Services:</strong> Transactional and marketing emails</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.2 Legal Requirements</h3>
                <p className="text-gray-700 mb-3">
                  We may disclose your information if required by law or in response to valid requests by public authorities.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.3 Business Transfers</h3>
                <p className="text-gray-700">
                  In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
                </p>
              </div>

              {/* Data Security */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-6 h-6 text-primary-600" />
                  <h2 className="text-2xl font-bold text-gray-900">4. Data Security</h2>
                </div>
                
                <p className="text-gray-700 mb-4">
                  We implement appropriate technical and organizational security measures to protect your personal information:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Encryption of data in transit (SSL/TLS) and at rest</li>
                  <li>Secure authentication and authorization mechanisms</li>
                  <li>Regular security audits and vulnerability assessments</li>
                  <li>Access controls and role-based permissions</li>
                  <li>Regular backups and disaster recovery procedures</li>
                </ul>
                <p className="text-gray-700 mt-4">
                  However, no method of transmission over the Internet or electronic storage is 100% secure. 
                  While we strive to use commercially acceptable means to protect your information, we cannot 
                  guarantee absolute security.
                </p>
              </div>

              {/* Your Rights */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">5. Your Privacy Rights</h2>
                
                <p className="text-gray-700 mb-4">Depending on your location, you may have the following rights:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                  <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                  <li><strong>Objection:</strong> Object to processing of your personal information</li>
                  <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
                  <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing where applicable</li>
                </ul>
                <p className="text-gray-700 mt-4">
                  To exercise these rights, please contact us at the email address provided below.
                </p>
              </div>

              {/* Cookies */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">6. Cookies and Tracking Technologies</h2>
                
                <p className="text-gray-700 mb-4">
                  We use cookies and similar tracking technologies to track activity on our Service and store certain information. 
                  Cookies are files with a small amount of data that may include an anonymous unique identifier.
                </p>
                <p className="text-gray-700 mb-4">
                  You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. 
                  However, if you do not accept cookies, you may not be able to use some portions of our Service.
                </p>
                <p className="text-gray-700">
                  We use cookies for authentication, session management, analytics, and to improve user experience.
                </p>
              </div>

              {/* Third-Party Services */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">7. Third-Party Services</h2>
                
                <p className="text-gray-700 mb-4">
                  Our Service contains links to third-party websites and integrates with third-party services. 
                  We are not responsible for the privacy practices of these third parties. We encourage you to 
                  review their privacy policies:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li><strong>Supabase:</strong> <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Privacy Policy</a></li>
                  <li><strong>OpenAI:</strong> <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Privacy Policy</a></li>
                  <li><strong>Vercel:</strong> <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Privacy Policy</a></li>
                  <li><strong>LinkedIn:</strong> <a href="https://www.linkedin.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Privacy Policy</a></li>
                  <li><strong>Facebook:</strong> <a href="https://www.facebook.com/privacy/explanation" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Privacy Policy</a></li>
                </ul>
              </div>

              {/* Data Retention */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Calendar className="w-6 h-6 text-primary-600" />
                  <h2 className="text-2xl font-bold text-gray-900">8. Data Retention</h2>
                </div>
                
                <p className="text-gray-700 mb-4">
                  We retain your personal information for as long as necessary to fulfill the purposes outlined in this 
                  Privacy Policy, unless a longer retention period is required or permitted by law.
                </p>
                <p className="text-gray-700">
                  When you delete your account, we will delete or anonymize your personal information, except where 
                  we are required to retain it for legal, regulatory, or business purposes.
                </p>
              </div>

              {/* Children's Privacy */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">9. Children's Privacy</h2>
                
                <p className="text-gray-700">
                  Our Service is not intended for children under the age of 13. We do not knowingly collect personal 
                  information from children under 13. If you are a parent or guardian and believe your child has provided 
                  us with personal information, please contact us immediately.
                </p>
              </div>

              {/* International Transfers */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">10. International Data Transfers</h2>
                
                <p className="text-gray-700">
                  Your information may be transferred to and processed in countries other than your country of residence. 
                  These countries may have data protection laws that differ from those in your country. We take appropriate 
                  safeguards to ensure your information is protected in accordance with this Privacy Policy.
                </p>
              </div>

              {/* Changes to Policy */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">11. Changes to This Privacy Policy</h2>
                
                <p className="text-gray-700 mb-4">
                  We may update our Privacy Policy from time to time. We will notify you of any changes by posting the 
                  new Privacy Policy on this page and updating the "Last updated" date.
                </p>
                <p className="text-gray-700">
                  You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy 
                  Policy are effective when they are posted on this page.
                </p>
              </div>

              {/* Contact Information */}
              <div className="mb-12 p-6 bg-primary-50 rounded-lg border border-primary-200">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="w-6 h-6 text-primary-600" />
                  <h2 className="text-2xl font-bold text-gray-900">12. Contact Us</h2>
                </div>
                
                <p className="text-gray-700 mb-4">
                  If you have any questions about this Privacy Policy or wish to exercise your privacy rights, please contact us:
                </p>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Email:</strong> <a href="mailto:privacy@georepute.ai" className="text-primary-600 hover:underline">privacy@georepute.ai</a></p>
                  <p><strong>Support:</strong> <a href="mailto:support@georepute.ai" className="text-primary-600 hover:underline">support@georepute.ai</a></p>
                  <p><strong>Website:</strong> <a href="https://georepute.ai/contact" className="text-primary-600 hover:underline">https://georepute.ai/contact</a></p>
                </div>
              </div>

              {/* GDPR Compliance */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">13. GDPR Compliance (EU Users)</h2>
                
                <p className="text-gray-700 mb-4">
                  If you are located in the European Economic Area (EEA), you have additional rights under the General 
                  Data Protection Regulation (GDPR):
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Right to be informed about data collection and processing</li>
                  <li>Right of access to your personal data</li>
                  <li>Right to rectification of inaccurate data</li>
                  <li>Right to erasure ("right to be forgotten")</li>
                  <li>Right to restrict processing</li>
                  <li>Right to data portability</li>
                  <li>Right to object to processing</li>
                  <li>Rights related to automated decision-making and profiling</li>
                </ul>
                <p className="text-gray-700 mt-4">
                  Our legal basis for processing your personal data includes: consent, contract performance, legal 
                  obligations, legitimate interests, and protection of vital interests.
                </p>
              </div>

              {/* CCPA Compliance */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">14. CCPA Compliance (California Users)</h2>
                
                <p className="text-gray-700 mb-4">
                  If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Right to know what personal information is collected, used, shared, or sold</li>
                  <li>Right to delete personal information held by businesses</li>
                  <li>Right to opt-out of the sale of personal information (we do not sell your information)</li>
                  <li>Right to non-discrimination for exercising your privacy rights</li>
                </ul>
              </div>

              {/* Final Note */}
              <div className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-700 text-center">
                  <strong>Thank you for trusting GeoRepute.ai with your information.</strong> We are committed to 
                  protecting your privacy and being transparent about how we use your data.
                </p>
              </div>

            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}


"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Eye, FileText, Mail, Calendar } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/language-context";

export default function PrivacyPolicy() {
  const { isRtl, t } = useLanguage();
  const lastUpdated = new Date().toLocaleDateString(isRtl ? 'he-IL' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100" dir={isRtl ? 'rtl' : 'ltr'}>
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
              {t.privacy.hero.title}
            </h1>
            <p className="text-lg text-gray-600">
              {t.privacy.hero.lastUpdated.replace('{date}', lastUpdated)}
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
                <p className="text-gray-700 leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: t.privacy.sections.intro.p1 }} />
                <p className="text-gray-700 leading-relaxed">
                  {t.privacy.sections.intro.p2}
                </p>
              </div>

              {/* Information We Collect */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <FileText className="w-6 h-6 text-primary-600" />
                  <h2 className="text-2xl font-bold text-gray-900">{t.privacy.sections.informationWeCollect.title}</h2>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">{t.privacy.sections.informationWeCollect.provided.title}</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  {t.privacy.sections.informationWeCollect.provided.items.map((item, idx) => (
                    <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
                  ))}
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">{t.privacy.sections.informationWeCollect.automatic.title}</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  {t.privacy.sections.informationWeCollect.automatic.items.map((item, idx) => (
                    <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
                  ))}
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">{t.privacy.sections.informationWeCollect.thirdParty.title}</h3>
                <p className="text-gray-700 mb-3">
                  {t.privacy.sections.informationWeCollect.thirdParty.p}
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  {t.privacy.sections.informationWeCollect.thirdParty.items.map((item, idx) => (
                    <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
                  ))}
                </ul>
              </div>

              {/* How We Use Information */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Eye className="w-6 h-6 text-primary-600" />
                  <h2 className="text-2xl font-bold text-gray-900">{t.privacy.sections.howWeUse.title}</h2>
                </div>
                
                <p className="text-gray-700 mb-4">{t.privacy.sections.howWeUse.p}</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  {t.privacy.sections.howWeUse.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Data Sharing */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Lock className="w-6 h-6 text-primary-600" />
                  <h2 className="text-2xl font-bold text-gray-900">{t.privacy.sections.dataSharing.title}</h2>
                </div>
                
                <p className="text-gray-700 mb-4">{t.privacy.sections.dataSharing.p}</p>
                
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">{t.privacy.sections.dataSharing.serviceProviders.title}</h3>
                <p className="text-gray-700 mb-3">
                  {t.privacy.sections.dataSharing.serviceProviders.p}
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  {t.privacy.sections.dataSharing.serviceProviders.items.map((item, idx) => (
                    <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
                  ))}
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">{t.privacy.sections.dataSharing.legal.title}</h3>
                <p className="text-gray-700 mb-3">
                  {t.privacy.sections.dataSharing.legal.p}
                </p>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">{t.privacy.sections.dataSharing.businessTransfers.title}</h3>
                <p className="text-gray-700">
                  {t.privacy.sections.dataSharing.businessTransfers.p}
                </p>
              </div>

              {/* Data Security */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-6 h-6 text-primary-600" />
                  <h2 className="text-2xl font-bold text-gray-900">{t.privacy.sections.dataSecurity.title}</h2>
                </div>
                
                <p className="text-gray-700 mb-4">
                  {t.privacy.sections.dataSecurity.p}
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  {t.privacy.sections.dataSecurity.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                <p className="text-gray-700 mt-4">
                  {t.privacy.sections.dataSecurity.note}
                </p>
              </div>

              {/* Your Rights */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.privacy.sections.yourRights.title}</h2>
                
                <p className="text-gray-700 mb-4">{t.privacy.sections.yourRights.p}</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  {t.privacy.sections.yourRights.items.map((item, idx) => (
                    <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
                  ))}
                </ul>
                <p className="text-gray-700 mt-4">
                  {t.privacy.sections.yourRights.contact}
                </p>
              </div>

              {/* Cookies */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.privacy.sections.cookies.title}</h2>
                
                <p className="text-gray-700 mb-4">
                  {t.privacy.sections.cookies.p1}
                </p>
                <p className="text-gray-700 mb-4">
                  {t.privacy.sections.cookies.p2}
                </p>
                <p className="text-gray-700">
                  {t.privacy.sections.cookies.p3}
                </p>
              </div>

              {/* Third-Party Services */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.privacy.sections.thirdParty.title}</h2>
                
                <p className="text-gray-700 mb-4">
                  {t.privacy.sections.thirdParty.p}
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  {t.privacy.sections.thirdParty.links.map((link, idx) => (
                    <li key={idx}>
                      <strong>{link.name}:</strong> <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Privacy Policy</a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Data Retention */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Calendar className="w-6 h-6 text-primary-600" />
                  <h2 className="text-2xl font-bold text-gray-900">{t.privacy.sections.dataRetention.title}</h2>
                </div>
                
                <p className="text-gray-700 mb-4">
                  {t.privacy.sections.dataRetention.p1}
                </p>
                <p className="text-gray-700">
                  {t.privacy.sections.dataRetention.p2}
                </p>
              </div>

              {/* Children's Privacy */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.privacy.sections.children.title}</h2>
                
                <p className="text-gray-700">
                  {t.privacy.sections.children.p}
                </p>
              </div>

              {/* International Transfers */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.privacy.sections.international.title}</h2>
                
                <p className="text-gray-700">
                  {t.privacy.sections.international.p}
                </p>
              </div>

              {/* Changes to Policy */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.privacy.sections.changes.title}</h2>
                
                <p className="text-gray-700 mb-4">
                  {t.privacy.sections.changes.p1}
                </p>
                <p className="text-gray-700">
                  {t.privacy.sections.changes.p2}
                </p>
              </div>

              {/* Contact Information */}
              <div className="mb-12 p-6 bg-primary-50 rounded-lg border border-primary-200">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="w-6 h-6 text-primary-600" />
                  <h2 className="text-2xl font-bold text-gray-900">{t.privacy.sections.contact.title}</h2>
                </div>
                
                <p className="text-gray-700 mb-4">
                  {t.privacy.sections.contact.p}
                </p>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Email:</strong> <a href={`mailto:${t.privacy.sections.contact.email}`} className="text-primary-600 hover:underline">{t.privacy.sections.contact.email}</a></p>
                  <p><strong>Support:</strong> <a href={`mailto:${t.privacy.sections.contact.support}`} className="text-primary-600 hover:underline">{t.privacy.sections.contact.support}</a></p>
                  <p><strong>Website:</strong> <a href={t.privacy.sections.contact.website} className="text-primary-600 hover:underline">{t.privacy.sections.contact.website}</a></p>
                </div>
              </div>

              {/* GDPR Compliance */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.privacy.sections.gdpr.title}</h2>
                
                <p className="text-gray-700 mb-4">
                  {t.privacy.sections.gdpr.p1}
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  {t.privacy.sections.gdpr.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                <p className="text-gray-700 mt-4">
                  {t.privacy.sections.gdpr.p2}
                </p>
              </div>

              {/* CCPA Compliance */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.privacy.sections.ccpa.title}</h2>
                
                <p className="text-gray-700 mb-4">
                  {t.privacy.sections.ccpa.p}
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  {t.privacy.sections.ccpa.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Final Note */}
              <div className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-700 text-center">
                  <strong>{t.privacy.sections.finalNote}</strong>
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


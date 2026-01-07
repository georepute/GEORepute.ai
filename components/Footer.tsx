"use client";

import Link from "next/link";
import Image from "next/image";
import { Twitter, Linkedin, Github, Mail } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export default function Footer() {
  const { isRtl, t } = useLanguage();

  const footerLinks = {
    [t.footer.product]: [
      { label: "Features", href: "/systems" },
      { label: "Pricing", href: "/pricing" },
      { label: "Demo", href: "/demo" },
      { label: "Documentation", href: "/docs" },
    ],
    [t.footer.company]: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
    ],
    [t.footer.resources]: [
      { label: "Help Center", href: "/help" },
      { label: "API Reference", href: "/api" },
      { label: "Case Studies", href: "/case-studies" },
      { label: "Community", href: "/community" },
    ],
    [t.footer.legal]: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "Security", href: "/security" },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
    { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
    { icon: Github, href: "https://github.com", label: "GitHub" },
    { icon: Mail, href: "mailto:contact@georepute.ai", label: "Email" },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link href="/" className={`flex items-center gap-3 mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="relative w-10 h-10">
                <Image
                  src="/logo.png"
                  alt={`${t.nav.brandName} Logo`}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-xl font-bold text-white">
                {t.nav.brandName}
              </span>
            </Link>
            <p className={`text-gray-400 mb-6 max-w-xs ${isRtl ? 'text-right' : ''}`}>
              {t.footer.tagline}
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 hover:bg-primary-600 rounded-lg flex items-center justify-center transition-colors duration-300"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className={isRtl ? 'text-right' : ''}>
              <h3 className="text-white font-semibold mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-gray-400 hover:text-primary-400 transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800">
          <div className={`flex flex-col md:flex-row justify-between items-center gap-4 ${isRtl ? 'md:flex-row-reverse' : ''}`}>
            <p className="text-gray-400 text-sm">
              {t.footer.copyright.replace('{year}', new Date().getFullYear().toString())}
            </p>
            <div className={`flex gap-6 text-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
              <Link href="/privacy" className="text-gray-400 hover:text-primary-400 transition-colors">
                {t.nav.privacy}
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-primary-400 transition-colors">
                Terms
              </Link>
              <Link href="/sitemap" className="text-gray-400 hover:text-primary-400 transition-colors">
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}


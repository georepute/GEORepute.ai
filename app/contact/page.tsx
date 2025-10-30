"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", email: "", company: "", phone: "", message: "" });
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Get in
              <span className="text-primary-500"> Touch</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Ready to transform your digital visibility? Let's talk about how 
              GeoRepute.ai can drive measurable results for your business.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-effect p-8 rounded-2xl"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
              
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-600">We'll get back to you within 24 hours.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                      placeholder="john@company.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                        placeholder="Company Inc"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      value={formData.message}
                      onChange={handleChange}
                      rows={5}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all resize-none"
                      placeholder="Tell us about your project..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-6 py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg font-semibold text-lg hover:shadow-xl hover:shadow-primary-500/50 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    Send Message
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              )}
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>
                <p className="text-gray-600 mb-8">
                  Choose the best way to reach us. We're here to help you succeed.
                </p>

                <div className="space-y-6">
                  <div className="glass-effect p-6 rounded-xl flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Email Us</h3>
                      <p className="text-gray-600">contact@georepute.ai</p>
                      <p className="text-gray-600">support@georepute.ai</p>
                    </div>
                  </div>

                  <div className="glass-effect p-6 rounded-xl flex items-start gap-4">
                    <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-accent-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Call Us</h3>
                      <p className="text-gray-600">US: +1 (555) 123-4567</p>
                      <p className="text-gray-600">IL: +972 (0)50-123-4567</p>
                    </div>
                  </div>

                  <div className="glass-effect p-6 rounded-xl flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Visit Us</h3>
                      <p className="text-gray-600">Tel Aviv, Israel</p>
                      <p className="text-gray-600">San Francisco, CA</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-effect p-6 rounded-xl bg-gradient-to-br from-primary-50 to-accent-50">
                <h3 className="font-bold text-gray-900 mb-3 text-lg">Business Hours</h3>
                <div className="space-y-2 text-gray-600">
                  <p className="flex justify-between">
                    <span>Monday - Friday:</span>
                    <span className="font-medium">9:00 AM - 6:00 PM</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Saturday - Sunday:</span>
                    <span className="font-medium">Closed</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-4">
                    * Support available 24/7 for enterprise customers
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Quick answers to common questions
            </p>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                q: "How quickly can I see results?",
                a: "Most clients see measurable improvements in AI visibility within 2-4 weeks, with significant SEO ranking improvements within 2-3 months."
              },
              {
                q: "Do you offer custom enterprise solutions?",
                a: "Yes! We provide fully customized solutions for enterprises with specific needs, including dedicated support and custom integrations."
              },
              {
                q: "Is there a free trial available?",
                a: "Absolutely. We offer a 14-day free trial with full access to all features. No credit card required."
              },
              {
                q: "Can I white-label the platform for my agency?",
                a: "Yes, our platform is fully white-labelable with custom branding, domains, and client portals—perfect for agencies."
              },
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-effect p-6 rounded-xl"
              >
                <h3 className="font-bold text-gray-900 mb-2 text-lg">{faq.q}</h3>
                <p className="text-gray-600 leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}


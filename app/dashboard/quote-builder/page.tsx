"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { 
  FileText, 
  Plus,
  Download,
  Send,
  Eye,
  Edit,
  Copy,
  DollarSign,
  Calendar,
  TrendingUp,
  Target,
  Check
} from "lucide-react";

export default function QuoteBuilder() {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const services = [
    {
      id: "geo-core",
      name: "GEO Core System",
      description: "AI-driven visibility optimization across all platforms",
      price: 2999,
      features: ["AI visibility tracking", "Keyword forecasting", "Self-learning optimization"]
    },
    {
      id: "content-orchestrator",
      name: "Content Orchestrator",
      description: "Multi-platform content management with approval workflow",
      price: 1499,
      features: ["Workflow automation", "Multi-platform publishing", "Performance analytics"]
    },
    {
      id: "adsync",
      name: "AdSync Integration",
      description: "Paid and organic visibility synchronization",
      price: 999,
      features: ["Google Ads integration", "Budget optimization", "ROI tracking"]
    },
    {
      id: "video-reports",
      name: "Video Reports",
      description: "AI-generated video summaries with narration",
      price: 799,
      features: ["Monthly videos", "AI narration", "Custom branding"]
    },
    {
      id: "white-label",
      name: "White-Label Package",
      description: "Full branding customization for agencies",
      price: 1999,
      features: ["Custom domain", "Logo & colors", "Client portals"]
    },
    {
      id: "support",
      name: "Premium Support",
      description: "24/7 dedicated support with SLA",
      price: 499,
      features: ["24/7 availability", "Dedicated manager", "Priority response"]
    },
  ];

  const recentQuotes = [
    {
      id: 1,
      clientName: "Tech Innovators Inc",
      amount: 5497,
      status: "sent",
      date: "2024-10-18",
      services: 3
    },
    {
      id: 2,
      clientName: "Digital Marketing Pro",
      amount: 7495,
      status: "accepted",
      date: "2024-10-15",
      services: 5
    },
    {
      id: 3,
      clientName: "Enterprise Solutions Ltd",
      amount: 12990,
      status: "draft",
      date: "2024-10-20",
      services: 6
    },
  ];

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const calculateTotal = () => {
    return services
      .filter(s => selectedServices.includes(s.id))
      .reduce((sum, s) => sum + s.price, 0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent": return "bg-blue-100 text-blue-700";
      case "accepted": return "bg-green-100 text-green-700";
      case "draft": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Quote Builder</h1>
        <p className="text-gray-600">Generate branded client proposals from system data</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <FileText className="w-8 h-8 text-blue-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">47</div>
          <p className="text-gray-600">Total Quotes</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <DollarSign className="w-8 h-8 text-green-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">$342K</div>
          <p className="text-gray-600">Total Value</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <TrendingUp className="w-8 h-8 text-purple-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">68%</div>
          <p className="text-gray-600">Acceptance Rate</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <Target className="w-8 h-8 text-orange-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">$7.2K</div>
          <p className="text-gray-600">Avg. Quote Value</p>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quote Builder */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Client Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  placeholder="Company Name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="john@company.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid Until
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                />
              </div>
            </div>
          </motion.div>

          {/* Services Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Select Services</h2>
            <div className="space-y-3">
              {services.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.05 }}
                  onClick={() => toggleService(service.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedServices.includes(service.id)
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          selectedServices.includes(service.id)
                            ? "border-primary-600 bg-primary-600"
                            : "border-gray-300"
                        }`}>
                          {selectedServices.includes(service.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900">{service.name}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 ml-8">{service.description}</p>
                      <div className="flex flex-wrap gap-2 ml-8">
                        {service.features.map((feature) => (
                          <span key={feature} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-gray-900">${service.price}</div>
                      <div className="text-sm text-gray-600">/month</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Summary & Actions */}
        <div className="space-y-6">
          {/* Quote Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-xl p-6 border border-gray-200 sticky top-24"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quote Summary</h2>
            
            <div className="space-y-3 mb-6">
              {selectedServices.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  No services selected
                </p>
              ) : (
                services
                  .filter(s => selectedServices.includes(s.id))
                  .map(service => (
                    <div key={service.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{service.name}</span>
                      <span className="font-semibold text-gray-900">${service.price}</span>
                    </div>
                  ))
              )}
            </div>

            <div className="border-t border-gray-200 pt-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-3xl font-bold text-primary-600">
                  ${calculateTotal().toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-600 text-right">per month</p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button 
                disabled={selectedServices.length === 0}
                className="w-full px-4 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                Send Quote
              </button>
              <button 
                disabled={selectedServices.length === 0}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button 
                disabled={selectedServices.length === 0}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Recent Quotes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-8 bg-white rounded-xl p-6 border border-gray-200"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Quotes</h2>
        <div className="space-y-4">
          {recentQuotes.map((quote) => (
            <div key={quote.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900">{quote.clientName}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(quote.status)}`}>
                    {quote.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    ${quote.amount.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {quote.services} services
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(quote.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}


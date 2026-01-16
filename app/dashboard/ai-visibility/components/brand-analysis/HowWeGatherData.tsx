"use client";
import React from 'react';
import Card } from "@/components/Card";
import { 
  Database, 
  Bot, 
  FileText, 
  TrendingUp, 
  RefreshCw,
  Search,
  Brain,
  Target,
  Clock,
  CheckCircle
} from "lucide-react";
import Badge from "@/components/Badge";
import { Separator } from "@/components/ui/separator";

export function HowWeGatherData() {
  const dataSteps = [
    {
      icon: <Search className="w-5 h-5" />,
      title: "Website Analysis",
      description: "We analyze your website's structure, content, and technical setup to understand how AI systems can discover, crawl, and interpret your brand information.",
      details: []
    },
    {
      icon: <Bot className="w-5 h-5" />,
      title: "AI Platform Testing",
      description: "We systematically query major AI platforms (ChatGPT, Claude, Perplexity, Gemini) using industry-relevant prompts to see exactly when, where, and how your brand appears in their responses.",
      details: []
    },
    {
      icon: <FileText className="w-5 h-5" />,
      title: "Mention Analysis & Tracking",
      description: "We analyze each AI response to identify brand mentions, competitor appearances, sentiment, and context. This creates a comprehensive picture of your brand's AI visibility performance.",
      details: []
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Actionable Recommendations",
      description: "Our AI analyzes your website structure, mention patterns, and competitive landscape to generate specific, technical recommendations for improving your brand's AI visibility.",
      details: []
    },
    {
      icon: <RefreshCw className="w-5 h-5" />,
      title: "Ongoing Monitoring", 
      description: "We continuously re-run analysis sessions to track changes in your AI visibility over time, monitoring how AI platforms evolve their responses about your brand and competitors.",
      details: []
    }
  ];

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <Database className="w-6 h-6 text-primary" />
          How We Gather Data
        </CardTitle>
        <p className="text-muted-foreground">
          Understanding our comprehensive data collection and analysis process
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        {dataSteps.map((step, index) => (
          <div key={index} className="relative">
            {/* Step Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  {step.icon}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <Badge variant="outline" className="text-xs">
                    Step {index + 1}
                  </Badge>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>

            {/* Step Details */}
            {step.details.length > 0 && (
              <div className="ml-14 pl-4 border-l-2 border-muted">
                <ul className="space-y-2">
                  {step.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Connector Line (except for last item) */}
            {index < dataSteps.length - 1 && (
              <div className="absolute left-5 top-14 w-0.5 h-12 bg-muted"></div>
            )}
          </div>
        ))}

        <Separator className="my-6" />
        
        {/* Data Freshness Indicator */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-primary">Data Freshness</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            All analysis data is automatically refreshed every 7 days to ensure you're always working with the most current insights. 
            Your next update is scheduled for approximately one week after your last analysis run.
          </p>
        </div>

        {/* Transparency Note */}
        <div className="bg-muted/50 rounded-lg p-4 border">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold mb-2">Our Commitment to Transparency</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We believe in complete transparency about our data collection methods. All insights are generated from publicly available AI platform responses, 
                and we never access private or confidential information. Our analysis is designed to help you understand and improve your brand's visibility 
                in the evolving AI-powered search landscape.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
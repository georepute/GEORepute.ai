import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Download, Settings, Eye, Mail } from 'lucide-react';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[];
  format: 'pdf' | 'html' | 'docx';
}

interface ReportConfig {
  title: string;
  subtitle: string;
  template: string;
  includeCharts: boolean;
  includeBenchmarks: boolean;
  includeRecommendations: boolean;
  includeCompetitorAnalysis: boolean;
  brandLogo?: string;
  customSections: string[];
  recipients: string[];
}

interface ReportGeneratorProps {
  projectId: string;
  scanData: any;
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'executive',
    name: 'Executive Summary',
    description: 'High-level overview for leadership and stakeholders',
    sections: ['executive_summary', 'key_metrics', 'recommendations', 'next_steps'],
    format: 'pdf'
  },
  {
    id: 'detailed',
    name: 'Detailed Analysis',
    description: 'Comprehensive report with all data and insights',
    sections: ['overview', 'methodology', 'platform_analysis', 'competitive_analysis', 'recommendations', 'appendix'],
    format: 'pdf'
  },
  {
    id: 'competitive',
    name: 'Competitive Intelligence',
    description: 'Focus on competitive positioning and market analysis',
    sections: ['market_overview', 'competitor_analysis', 'gap_analysis', 'positioning_strategy'],
    format: 'pdf'
  },
  {
    id: 'technical',
    name: 'Technical Report',
    description: 'Detailed technical analysis for SEO and content teams',
    sections: ['technical_analysis', 'prompt_performance', 'optimization_opportunities', 'implementation_guide'],
    format: 'pdf'
  }
];

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({ projectId, scanData }) => {
  const [config, setConfig] = useState<ReportConfig>({
    title: 'Brand Visibility Analysis Report',
    subtitle: `Generated on ${new Date().toLocaleDateString()}`,
    template: 'detailed',
    includeCharts: true,
    includeBenchmarks: true,
    includeRecommendations: true,
    includeCompetitorAnalysis: true,
    customSections: [],
    recipients: []
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [newRecipient, setNewRecipient] = useState('');

  const generateReport = async () => {
    setIsGenerating(true);

    // Simulate report generation - replace with actual PDF generation
    setTimeout(() => {
      const mockReport = {
        id: Date.now().toString(),
        title: config.title,
        pages: 15,
        fileSize: '2.3 MB',
        downloadUrl: '/reports/mock-report.pdf',
        generatedAt: new Date(),
        sections: REPORT_TEMPLATES.find(t => t.id === config.template)?.sections || []
      };

      setGeneratedReport(mockReport);
      setIsGenerating(false);
    }, 3000);
  };

  const downloadReport = () => {
    // Simulate download
    console.log('Downloading report:', generatedReport.downloadUrl);
  };

  const emailReport = () => {
    // Simulate email sending
    console.log('Emailing report to:', config.recipients);
  };

  const addRecipient = () => {
    if (newRecipient.trim() && !config.recipients.includes(newRecipient)) {
      setConfig(prev => ({
        ...prev,
        recipients: [...prev.recipients, newRecipient.trim()]
      }));
      setNewRecipient('');
    }
  };

  const removeRecipient = (email: string) => {
    setConfig(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r !== email)
    }));
  };

  const selectedTemplate = REPORT_TEMPLATES.find(t => t.id === config.template);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Report Generator</h2>
        <div className="flex gap-2">
          {generatedReport && (
            <>
              <Button onClick={downloadReport} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button onClick={emailReport} variant="outline">
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Report Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Report Title
                  </label>
                  <Input
                    value={config.title}
                    onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter report title..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Subtitle
                  </label>
                  <Input
                    value={config.subtitle}
                    onChange={(e) => setConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Enter subtitle..."
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Report Template
                </label>
                <Select value={config.template} onValueChange={(value) => setConfig(prev => ({ ...prev, template: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TEMPLATES.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-muted-foreground">{template.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Include Sections</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="charts"
                      checked={config.includeCharts}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeCharts: !!checked }))}
                    />
                    <label htmlFor="charts" className="text-sm text-foreground">Charts & Graphs</label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="benchmarks"
                      checked={config.includeBenchmarks}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeBenchmarks: !!checked }))}
                    />
                    <label htmlFor="benchmarks" className="text-sm text-foreground">Industry Benchmarks</label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="recommendations"
                      checked={config.includeRecommendations}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeRecommendations: !!checked }))}
                    />
                    <label htmlFor="recommendations" className="text-sm text-foreground">Recommendations</label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="competitor"
                      checked={config.includeCompetitorAnalysis}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeCompetitorAnalysis: !!checked }))}
                    />
                    <label htmlFor="competitor" className="text-sm text-foreground">Competitor Analysis</label>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Email Recipients
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    placeholder="Enter email address..."
                    onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                  />
                  <Button onClick={addRecipient} variant="outline">Add</Button>
                </div>
                {config.recipients.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {config.recipients.map(email => (
                      <Badge key={email} variant="secondary" className="cursor-pointer" onClick={() => removeRecipient(email)}>
                        {email} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview & Generation */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Report Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTemplate && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-foreground">{selectedTemplate.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Included Sections:</h4>
                    <ul className="space-y-1">
                      {selectedTemplate.sections.map(section => (
                        <li key={section} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-1 h-1 bg-primary rounded-full" />
                          {section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button 
                    onClick={generateReport}
                    disabled={isGenerating}
                    className="w-full"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {isGenerating ? 'Generating...' : 'Generate Report'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {generatedReport && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Title:</span>
                  <span className="font-medium text-foreground">{generatedReport.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pages:</span>
                  <span className="font-medium text-foreground">{generatedReport.pages}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">File Size:</span>
                  <span className="font-medium text-foreground">{generatedReport.fileSize}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Generated:</span>
                  <span className="font-medium text-foreground">
                    {generatedReport.generatedAt.toLocaleString()}
                  </span>
                </div>
                
                <div className="pt-3 border-t">
                  <Badge variant="default" className="w-full justify-center">
                    <FileText className="w-3 h-3 mr-1" />
                    Ready for Download
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
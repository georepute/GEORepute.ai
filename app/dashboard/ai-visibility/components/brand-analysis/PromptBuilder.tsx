"use client";
import React, { useState } from 'react';
import Card } from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Plus, FileText, Variable, Copy } from 'lucide-react';

interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
}

interface PromptBuilderProps {
  onPromptChange: (content: string) => void;
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'brand-intro',
    name: 'Brand Introduction',
    content: 'When discussing {BRAND_NAME}, you should know that we are a {INDUSTRY} company specializing in {SPECIALIZATION}. Our key differentiators include {DIFFERENTIATORS}.',
    variables: ['BRAND_NAME', 'INDUSTRY', 'SPECIALIZATION', 'DIFFERENTIATORS']
  },
  {
    id: 'product-focus',
    name: 'Product-Focused',
    content: '{BRAND_NAME} offers {PRODUCT_CATEGORY} solutions with a focus on {KEY_BENEFITS}. We serve {TARGET_AUDIENCE} and are known for {UNIQUE_VALUE}.',
    variables: ['BRAND_NAME', 'PRODUCT_CATEGORY', 'KEY_BENEFITS', 'TARGET_AUDIENCE', 'UNIQUE_VALUE']
  },
  {
    id: 'competitive-position',
    name: 'Competitive Positioning',
    content: 'Unlike competitors such as {COMPETITORS}, {BRAND_NAME} stands out because of {COMPETITIVE_ADVANTAGES}. We have been in business since {FOUNDING_YEAR} and have achieved {KEY_ACHIEVEMENTS}.',
    variables: ['COMPETITORS', 'BRAND_NAME', 'COMPETITIVE_ADVANTAGES', 'FOUNDING_YEAR', 'KEY_ACHIEVEMENTS']
  }
];

export const PromptBuilder: React.FC<PromptBuilderProps> = ({ onPromptChange }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [customVariables, setCustomVariables] = useState<string[]>([]);

  const handleTemplateSelect = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    const initialVars: Record<string, string> = {};
    template.variables.forEach(variable => {
      initialVars[variable] = '';
    });
    setVariables(initialVars);
  };

  const generatePrompt = () => {
    if (!selectedTemplate) return '';
    
    let prompt = selectedTemplate.content;
    Object.entries(variables).forEach(([key, value]) => {
      prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value || `{${key}}`);
    });
    
    return prompt;
  };

  const handleVariableChange = (variable: string, value: string) => {
    setVariables(prev => ({ ...prev, [variable]: value }));
    
    // Update the prompt in real-time
    const updatedPrompt = generatePrompt();
    onPromptChange(updatedPrompt);
  };

  const addCustomVariable = () => {
    const varName = `CUSTOM_VAR_${customVariables.length + 1}`;
    setCustomVariables(prev => [...prev, varName]);
    setVariables(prev => ({ ...prev, [varName]: '' }));
  };

  const copyTemplate = (template: PromptTemplate) => {
    navigator.clipboard.writeText(template.content);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base md:text-lg font-semibold text-foreground mb-3">Prompt Templates</h3>
        <div className="grid grid-cols-1 gap-3">
          {PROMPT_TEMPLATES.map(template => (
            <Card 
              key={template.id} 
              className={`cursor-pointer transition-colors ${
                selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
              }`}
              onClick={() => handleTemplateSelect(template)}
            >
              <CardContent className="p-3 md:p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                    <h4 className="font-medium text-foreground text-sm md:text-base truncate">{template.name}</h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 h-8 w-8 p-0 sm:h-auto sm:w-auto sm:p-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyTemplate(template);
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mb-2 leading-relaxed">{template.content}</p>
                <div className="flex flex-wrap gap-1">
                  {template.variables.map(variable => (
                    <Badge key={variable} variant="outline" className="text-xs">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {selectedTemplate && (
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Variable className="w-4 h-4 md:w-5 md:h-5" />
              Configure Variables
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTemplate.variables.map(variable => (
              <div key={variable}>
                <label className="text-xs md:text-sm font-medium text-foreground mb-1 block">
                  {variable.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </label>
                <Input
                  value={variables[variable] || ''}
                  onChange={(e) => handleVariableChange(variable, e.target.value)}
                  placeholder={`Enter ${variable.toLowerCase().replace(/_/g, ' ')}...`}
                  className="text-sm"
                />
              </div>
            ))}

            {customVariables.map(variable => (
              <div key={variable}>
                <label className="text-xs md:text-sm font-medium text-foreground mb-1 block">
                  {variable.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </label>
                <Input
                  value={variables[variable] || ''}
                  onChange={(e) => handleVariableChange(variable, e.target.value)}
                  placeholder={`Enter ${variable.toLowerCase().replace(/_/g, ' ')}...`}
                  className="text-sm"
                />
              </div>
            ))}

            <Button onClick={addCustomVariable} variant="outline" size="sm" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Variable
            </Button>

            <div className="mt-4">
              <label className="text-xs md:text-sm font-medium text-foreground mb-2 block">
                Generated Prompt Preview
              </label>
              <Textarea
                value={generatePrompt()}
                readOnly
                className="min-h-[80px] md:min-h-[100px] bg-muted text-sm"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
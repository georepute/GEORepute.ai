/**
 * Schema Automation - JSON-LD Structured Data Generator
 * 
 * Automatically generates SEO-friendly structured data (JSON-LD) for content
 * to improve search engine visibility and enable rich snippets.
 * 
 * Supported Schema Types:
 * - Article (blog posts, articles)
 * - FAQPage (content with Q&A format)
 * - Organization (brand/company info)
 * - BreadcrumbList (navigation structure)
 * - WebPage (general web pages)
 */

export interface SchemaGeneratorInput {
  content: string;
  title?: string;
  topic: string;
  keywords: string[];
  platform: string;
  author?: {
    name: string;
    url?: string;
  };
  publishedDate?: string;
  modifiedDate?: string;
  url?: string;
  imageUrl?: string;
  description?: string;
  brandName?: string;
  organizationUrl?: string;
  faqPairs?: Array<{ question: string; answer: string }>;
  headings?: Array<{ level: number; text: string; position: number }>; // For structured content
}

export interface SchemaOutput {
  "@context": string;
  "@type": string;
  [key: string]: any;
}

/**
 * Generate Article schema (most common for blog posts and articles)
 */
export function generateArticleSchema(input: SchemaGeneratorInput): SchemaOutput {
  const schema: SchemaOutput = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title || input.topic,
    description: input.description || extractDescription(input.content),
    keywords: input.keywords.join(", "),
    datePublished: input.publishedDate || new Date().toISOString(),
    dateModified: input.modifiedDate || input.publishedDate || new Date().toISOString(),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": input.url || "#",
    },
    // Add URL for canonical reference
    ...(input.url && { url: input.url }),
  };

  // Add headings structure if provided (for structured SEO content)
  if (input.headings && input.headings.length > 0) {
    const h1Heading = input.headings.find(h => h.level === 1);
    if (h1Heading) {
      schema.headline = h1Heading.text;
    }
    
    // Store H2 headings in articleSection for SEO structure
    const h2Headings = input.headings.filter(h => h.level === 2);
    if (h2Headings.length > 0) {
      schema.articleSection = h2Headings.map(h => h.text);
    }
    
    // Store H3 headings in schema for complete structure
    const h3Headings = input.headings.filter(h => h.level === 3);
    if (h3Headings.length > 0) {
      // Add H3 headings as sub-sections
      schema.hasPart = h3Headings.map(h => ({
        "@type": "Article",
        headline: h.text,
      }));
    }
  }

  // Add author if provided
  if (input.author) {
    schema.author = {
      "@type": "Person",
      name: input.author.name,
      ...(input.author.url ? { url: input.author.url } : {}),
    };
  }

  // Add publisher (organization) if provided
  if (input.brandName || input.organizationUrl) {
    schema.publisher = {
      "@type": "Organization",
      name: input.brandName || "Organization",
      ...(input.organizationUrl ? { url: input.organizationUrl } : {}),
    };
  }

  // Add image if provided
  if (input.imageUrl) {
    schema.image = {
      "@type": "ImageObject",
      url: input.imageUrl,
    };
  }

  // Add article body
  schema.articleBody = input.content;

  return schema;
}

/**
 * Generate FAQPage schema (for content with Q&A format)
 */
export function generateFAQPageSchema(input: SchemaGeneratorInput): SchemaOutput {
  if (!input.faqPairs || input.faqPairs.length === 0) {
    // Try to extract FAQs from content
    const extractedFAQs = extractFAQsFromContent(input.content);
    if (extractedFAQs.length === 0) {
      // Fallback to Article schema if no FAQs found
      return generateArticleSchema(input);
    }
    input.faqPairs = extractedFAQs;
  }

  const schema: SchemaOutput = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: input.faqPairs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  // Add page info
  if (input.title) {
    schema.headline = input.title;
  }
  if (input.url) {
    schema.url = input.url;
  }

  return schema;
}

/**
 * Generate Organization schema (for brand/company pages)
 */
export function generateOrganizationSchema(input: SchemaGeneratorInput): SchemaOutput {
  const schema: SchemaOutput = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.brandName || "Organization",
    ...(input.organizationUrl ? { url: input.organizationUrl } : {}),
    ...(input.description ? { description: input.description } : {}),
  };

  // Add logo if image provided
  if (input.imageUrl) {
    schema.logo = {
      "@type": "ImageObject",
      url: input.imageUrl,
    };
  }

  // Add sameAs (social media profiles) if available
  const sameAs: string[] = [];
  if (input.platform === "facebook" && input.url) {
    sameAs.push(input.url);
  }
  if (sameAs.length > 0) {
    schema.sameAs = sameAs;
  }

  return schema;
}

/**
 * Generate BreadcrumbList schema (for navigation)
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
): SchemaOutput {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate WebPage schema (general purpose)
 */
export function generateWebPageSchema(input: SchemaGeneratorInput): SchemaOutput {
  const schema: SchemaOutput = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.title || input.topic,
    description: input.description || extractDescription(input.content),
    ...(input.url ? { url: input.url } : {}),
    ...(input.keywords.length > 0 ? { keywords: input.keywords.join(", ") } : {}),
  };

  // Add primary image
  if (input.imageUrl) {
    schema.primaryImageOfPage = {
      "@type": "ImageObject",
      url: input.imageUrl,
    };
  }

  // Add date published
  if (input.publishedDate) {
    schema.datePublished = input.publishedDate;
  }

  return schema;
}

/**
 * Auto-detect and generate appropriate schema based on content
 */
export function generateAutoSchema(input: SchemaGeneratorInput): SchemaOutput {
  // Check if content has FAQ format
  const faqs = extractFAQsFromContent(input.content);
  if (faqs.length >= 2) {
    return generateFAQPageSchema({ ...input, faqPairs: faqs });
  }

  // Check if it's organization/brand focused
  if (input.brandName && input.platform === "linkedin") {
    return generateOrganizationSchema(input);
  }

  // Default to Article schema (most common)
  return generateArticleSchema(input);
}

/**
 * Generate multiple schemas for comprehensive SEO
 */
export function generateMultipleSchemas(input: SchemaGeneratorInput): SchemaOutput[] {
  const schemas: SchemaOutput[] = [];

  // Always generate Article schema
  schemas.push(generateArticleSchema(input));

  // Add FAQ schema if FAQs are detected
  const faqs = extractFAQsFromContent(input.content);
  if (faqs.length >= 2) {
    schemas.push(generateFAQPageSchema({ ...input, faqPairs: faqs }));
  }

  // Add Organization schema if brand info is available
  if (input.brandName) {
    schemas.push(generateOrganizationSchema(input));
  }

  return schemas;
}

/**
 * Convert schema to JSON-LD script tag HTML
 */
export function schemaToScriptTag(schema: SchemaOutput | SchemaOutput[]): string {
  const schemas = Array.isArray(schema) ? schema : [schema];
  return schemas
    .map((s) => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`)
    .join("\n");
}

/**
 * Extract description from content (first 160 characters)
 */
function extractDescription(content: string): string {
  // Remove markdown and HTML tags
  const plainText = content
    .replace(/[#*_`]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\n+/g, " ")
    .trim();

  // Take first 160 characters
  return plainText.length > 160 ? plainText.substring(0, 157) + "..." : plainText;
}

/**
 * Extract FAQ pairs from content
 * Looks for patterns like:
 * - Q: ... A: ...
 * - Question: ... Answer: ...
 * - FAQ: ... Answer: ...
 * - **Q:** ... **A:** ...
 */
function extractFAQsFromContent(content: string): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = [];

  // Pattern 1: Q: ... A: ...
  const qaPattern1 = /(?:^|\n)\s*(?:Q|Question|FAQ)[:\.]\s*(.+?)\s*(?:A|Answer)[:\.]\s*(.+?)(?=\n\s*(?:Q|Question|FAQ)|$)/gis;
  let match;
  while ((match = qaPattern1.exec(content)) !== null) {
    faqs.push({
      question: match[1].trim(),
      answer: match[2].trim(),
    });
  }

  // Pattern 2: **Q:** ... **A:** ...
  const qaPattern2 = /(?:^|\n)\s*\*\*Q:\*\*\s*(.+?)\s*\*\*A:\*\*\s*(.+?)(?=\n\s*\*\*Q:\*\*|$)/gis;
  while ((match = qaPattern2.exec(content)) !== null) {
    faqs.push({
      question: match[1].trim(),
      answer: match[2].trim(),
    });
  }

  // Pattern 3: ### Question ... (paragraph) ... ### Answer ...
  const qaPattern3 = /(?:^|\n)\s*###\s*(?:Q|Question)[:\.]?\s*(.+?)\s*(?:###\s*(?:A|Answer)[:\.]?\s*(.+?)(?=\n\s*###|$))/gis;
  while ((match = qaPattern3.exec(content)) !== null) {
    faqs.push({
      question: match[1].trim(),
      answer: match[2]?.trim() || "",
    });
  }

  // Remove duplicates
  const uniqueFAQs = faqs.filter(
    (faq, index, self) =>
      index === self.findIndex((f) => f.question.toLowerCase() === faq.question.toLowerCase())
  );

  return uniqueFAQs.slice(0, 10); // Limit to 10 FAQs
}

/**
 * Generate schema based on platform-specific requirements
 */
export function generatePlatformSchema(
  input: SchemaGeneratorInput,
  platform: string
): SchemaOutput | SchemaOutput[] {
  switch (platform.toLowerCase()) {
    case "medium":
    case "quora":
    case "github":
      // Article schema for long-form content
      return generateArticleSchema(input);

    case "linkedin":
      // Article with organization focus
      return generateArticleSchema(input);

    case "facebook":
    case "instagram":
    case "twitter":
      // WebPage schema for social media posts
      return generateWebPageSchema(input);

    default:
      // Auto-detect for other platforms
      return generateAutoSchema(input);
  }
}


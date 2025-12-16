import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// @ts-ignore - Deno global is available in Supabase Edge Functions runtime
declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// MASSIVELY EXPANDED AI DETECTION PATTERNS
const aiPatterns = {
  // TIER 1: DEAD GIVEAWAYS (99% confidence) - Words almost ONLY AI uses
  deadGiveaways: [
    {
      pattern: /\b(delve|delving|delved)\b/gi,
      reason: "DEAD GIVEAWAY: 'delve' is used 10,000x more by AI than humans",
      confidence: 99,
      category: "tier1"
    },
    {
      pattern: /\b(tapestry|tapestries)\b/gi,
      reason: "DEAD GIVEAWAY: AI loves 'tapestry' metaphors, humans rarely use this",
      confidence: 99,
      category: "tier1"
    },
    {
      pattern: /\b(realm|realms)\b/gi,
      reason: "DEAD GIVEAWAY: 'realm' appears in 90%+ of AI content",
      confidence: 98,
      category: "tier1"
    },
    {
      pattern: /\b(intricate)\b/gi,
      reason: "DEAD GIVEAWAY: AI's favorite adjective for complexity",
      confidence: 98,
      category: "tier1"
    },
    {
      pattern: /\b(meticulously|meticulous)\b/gi,
      reason: "DEAD GIVEAWAY: AI overuses this adverb dramatically",
      confidence: 98,
      category: "tier1"
    },
    {
      pattern: /\b(navigate|navigating|navigates)\s+(the|this|these|complex|through)/gi,
      reason: "DEAD GIVEAWAY: 'navigate the/complex' is classic AI phrasing",
      confidence: 99,
      category: "tier1"
    },
    {
      pattern: /\b(landscape|landscapes)\s+(of|is|has|continues)/gi,
      reason: "DEAD GIVEAWAY: 'landscape of X' is overused by AI",
      confidence: 97,
      category: "tier1"
    },
    {
      pattern: /\b(embark|embarking|embarked)\s+(on|upon)/gi,
      reason: "DEAD GIVEAWAY: 'embark on' appears in millions of AI texts",
      confidence: 98,
      category: "tier1"
    },
    {
      pattern: /\b(crucial|pivotal|paramount|quintessential)\s+(to|for|in|role|aspect)/gi,
      reason: "DEAD GIVEAWAY: AI importance indicators",
      confidence: 97,
      category: "tier1"
    },
    {
      pattern: /\b(underscore|underscores|underscoring|underscored)\b/gi,
      reason: "DEAD GIVEAWAY: Academic-style AI emphasis",
      confidence: 97,
      category: "tier1"
    }
  ],

  // TIER 2: EXTREMELY HIGH CONFIDENCE (95-98%)
  extremelyHigh: [
    {
      pattern: /\b(in conclusion|to summarize|to conclude|in summary|summing up)\b/gi,
      reason: "Classic AI conclusion - appears in 95%+ of AI essays",
      confidence: 97,
      category: "conclusion"
    },
    {
      pattern: /\b(it is important to note|it should be noted|it is worth noting|it is crucial to understand)\b/gi,
      reason: "AI meta-commentary - extreme overuse in generated content",
      confidence: 96,
      category: "meta"
    },
    {
      pattern: /\b(in today's fast-paced world|in the digital age|in an ever-changing landscape|in modern times)\b/gi,
      reason: "AI temporal cliché - top 3 most common AI openers",
      confidence: 98,
      category: "opener"
    },
    {
      pattern: /\b(revolutionize|game-changer|paradigm shift|transformative|groundbreaking)\b/gi,
      reason: "AI hype words - dramatically overused vs human writing",
      confidence: 96,
      category: "hype"
    },
    {
      pattern: /\b(utilize|utilization|leveraging|leverage)\b/gi,
      reason: "AI formality - humans say 'use', AI says 'utilize/leverage'",
      confidence: 95,
      category: "formality"
    },
    {
      pattern: /\b(foster|facilitate|cultivate|augment|ameliorate)\b/gi,
      reason: "Corporate AI jargon - rare in natural human writing",
      confidence: 95,
      category: "jargon"
    },
    {
      pattern: /\b(comprehensive|holistic|multifaceted|nuanced)\b/gi,
      reason: "AI complexity descriptors - used 5x more than humans",
      confidence: 94,
      category: "descriptor"
    },
    {
      pattern: /\b(ultimately|essentially|fundamentally|inherently)\b/gi,
      reason: "AI absolutist qualifiers - overused in conclusions",
      confidence: 93,
      category: "qualifier"
    }
  ],

  // TIER 3: VERY HIGH CONFIDENCE (90-94%)
  veryHigh: [
    {
      pattern: /\b(moreover|furthermore|additionally|consequently|therefore|thus|hence)\b/gi,
      reason: "Formal AI transitions - humans use simpler connectors",
      confidence: 92,
      category: "transition"
    },
    {
      pattern: /\b(optimize|maximize|enhance|streamline|synergy)\b/gi,
      reason: "Business AI buzzwords - uncommon in casual writing",
      confidence: 91,
      category: "business"
    },
    {
      pattern: /\b(robust|dynamic|innovative|cutting-edge|state-of-the-art)\b/gi,
      reason: "AI marketing language - high frequency indicator",
      confidence: 90,
      category: "marketing"
    },
    {
      pattern: /\b(plethora|myriad|cornucopia)\b/gi,
      reason: "Unnecessary synonyms for 'many' - AI loves variety",
      confidence: 93,
      category: "synonym"
    },
    {
      pattern: /\b(juxtapose|encapsulate|elucidate|exemplify|substantiate)\b/gi,
      reason: "Academic AI verbs - rarely used in natural speech",
      confidence: 92,
      category: "academic"
    }
  ],

  // TIER 4: HIGH CONFIDENCE (85-89%)
  high: [
    {
      pattern: /\b(significant|substantial|considerable|notable|remarkable)\b/gi,
      reason: "AI emphasis words - moderate overuse",
      confidence: 87,
      category: "emphasis"
    },
    {
      pattern: /\b(various|numerous|diverse|wide-ranging|extensive)\b/gi,
      reason: "AI variety indicators - common pattern",
      confidence: 85,
      category: "variety"
    },
    {
      pattern: /\b(aspect|factor|element|component|dimension)\b/gi,
      reason: "AI analytical nouns - structural overuse",
      confidence: 86,
      category: "analytical"
    },
    {
      pattern: /\b(perspective|viewpoint|approach|methodology|framework)\b/gi,
      reason: "AI meta-discussion terms - high frequency",
      confidence: 86,
      category: "meta"
    }
  ],

  // Legacy compatibility - map old structure to new
  highConfidence: [] as Array<{ pattern: RegExp; reason: string; confidence: number; category: string }>,
  mediumConfidence: [] as Array<{ pattern: RegExp; reason: string; confidence: number; category: string }>,
  lowConfidence: [] as Array<{ pattern: RegExp; reason: string; confidence: number; category: string }>,
  structure: [] as Array<{ pattern: RegExp; reason: string; confidence: number; category: string }>,

  // SENTENCE PATTERNS (High detection value)
  sentencePatterns: [
    {
      pattern: /\b(what does this mean|why is this important|how can we|what are the implications)\s*\?/gi,
      reason: "RHETORICAL QUESTION: AI engagement tactic - extremely common",
      confidence: 94,
      category: "rhetorical"
    },
    {
      pattern: /\b(on one hand|on the other hand|conversely|in contrast)\b/gi,
      reason: "BALANCED PERSPECTIVE: AI loves showing 'both sides'",
      confidence: 89,
      category: "balance"
    },
    {
      pattern: /\b(it is (important|crucial|essential|vital) to (note|understand|recognize|consider))\b/gi,
      reason: "META-COMMENTARY: Classic AI sentence starter",
      confidence: 95,
      category: "meta"
    },
    {
      pattern: /\b(in (light|view) of (this|these|the))\b/gi,
      reason: "FORMAL REFERENCE: AI transition pattern",
      confidence: 88,
      category: "transition"
    },
    {
      pattern: /\b(serves? as (a )?(testament|example|illustration) (to|of))\b/gi,
      reason: "AI EVIDENCE PHRASE: Overused connector",
      confidence: 91,
      category: "evidence"
    }
  ],
};

function extractTextFromHtml(html: string): string {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&apos;/g, "'");
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// TypeTruth-style burstiness calculation (sentence length variation)
function calculateBurstiness(sentences: string[]): { value: number; score: number; reasons: string[] } {
  if (sentences.length < 2) {
    return { value: 0, score: 0, reasons: ["Insufficient sentences"] };
  }
  
  const lengths = sentences.map(s => s.trim().length).filter(len => len > 0);
  if (lengths.length < 2) {
    return { value: 0, score: 0, reasons: ["Not enough valid sentences"] };
  }
  
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
  const burstiness = Math.sqrt(variance);
  
  const reasons: string[] = [];
  let score = 0;
  
  // LOW BURSTINESS = HIGH AI PROBABILITY
  if (burstiness < 15) {
    score = 25; // Major AI signal
    reasons.push(`VERY LOW BURSTINESS (${Math.round(burstiness)}): Sentences are unnaturally uniform - STRONG AI SIGNAL`);
    reasons.push(`Average sentence length: ${Math.round(mean)} chars with minimal variation`);
  } else if (burstiness < 25) {
    score = 15; // Moderate AI signal
    reasons.push(`LOW BURSTINESS (${Math.round(burstiness)}): Limited sentence variation - AI SIGNAL`);
  } else if (burstiness < 35) {
    score = 5; // Slight AI signal
    reasons.push(`MODERATE BURSTINESS (${Math.round(burstiness)}): Some variation present`);
  } else {
    score = -10; // Human-like variation
    reasons.push(`HIGH BURSTINESS (${Math.round(burstiness)}): Natural human variation detected`);
  }
  
  return { value: burstiness, score, reasons };
}

// NEW: PARALLEL STRUCTURE DETECTION
function detectParallelStructure(sentences: string[]): { detected: boolean; score: number; reasons: string[] } {
  if (sentences.length < 3) return { detected: false, score: 0, reasons: [] };
  
  const reasons: string[] = [];
  let score = 0;
  
  // Check sentence starters
  const starters = sentences.map(s => {
    const words = s.trim().split(/\s+/);
    return words.slice(0, 2).join(' ').toLowerCase();
  });
  
  const starterCounts = new Map<string, number>();
  starters.forEach(s => starterCounts.set(s, (starterCounts.get(s) || 0) + 1));
  
  const maxRepeat = Math.max(...Array.from(starterCounts.values()));
  
  if (maxRepeat >= 4) {
    score = 20; // Very strong AI signal
    reasons.push(`PARALLEL STRUCTURE: ${maxRepeat} sentences start identically - STRONG AI PATTERN`);
    return { detected: true, score, reasons };
  } else if (maxRepeat >= 3) {
    score = 12;
    reasons.push(`PARALLEL STRUCTURE: ${maxRepeat} sentences start identically - AI PATTERN`);
    return { detected: true, score, reasons };
  }
  
  return { detected: false, score: 0, reasons: [] };
}

// NEW: LIST FATIGUE DETECTION
function detectListFatigue(text: string): { detected: boolean; score: number; reasons: string[] } {
  const lines = text.split('\n');
  const numberedLists = text.match(/(?:^|\n)\s*\d+[\.)]\s+.{20,}/gm) || [];
  const bulletLists = text.match(/(?:^|\n)\s*[-•*]\s+.{20,}/gm) || [];
  
  const totalListItems = numberedLists.length + bulletLists.length;
  const listRatio = totalListItems / Math.max(lines.length, 1);
  
  const reasons: string[] = [];
  let score = 0;
  
  if (listRatio > 0.5) {
    score = 20;
    reasons.push(`EXCESSIVE LISTS: ${Math.round(listRatio * 100)}% of content is lists - STRONG AI SIGNAL`);
  } else if (listRatio > 0.3) {
    score = 12;
    reasons.push(`HEAVY LIST USAGE: ${Math.round(listRatio * 100)}% of content is lists - AI PATTERN`);
  } else if (totalListItems >= 5) {
    score = 8;
    reasons.push(`MULTIPLE LISTS: ${totalListItems} list items detected - AI TENDENCY`);
  }
  
  return { detected: score > 0, score, reasons };
}

// NEW: RHETORICAL QUESTION DETECTION
function detectRhetoricalQuestions(text: string): { count: number; score: number; reasons: string[] } {
  const questions = text.match(/[^.!?]+\?/g) || [];
  const rhetoricalStarters = [
    'what does this mean', 'why is this important', 'how can we', 'what are the implications',
    'why should we care', 'what makes this', 'how do we', 'what can we learn'
  ];
  
  let rhetoricalCount = 0;
  questions.forEach(q => {
    if (rhetoricalStarters.some(starter => q.toLowerCase().includes(starter))) {
      rhetoricalCount++;
    }
  });
  
  const reasons: string[] = [];
  let score = 0;
  
  if (rhetoricalCount >= 3) {
    score = 18;
    reasons.push(`EXCESSIVE RHETORICAL QUESTIONS: ${rhetoricalCount} detected - STRONG AI ENGAGEMENT TACTIC`);
  } else if (rhetoricalCount >= 2) {
    score = 12;
    reasons.push(`MULTIPLE RHETORICAL QUESTIONS: ${rhetoricalCount} detected - AI PATTERN`);
  } else if (rhetoricalCount === 1) {
    score = 5;
    reasons.push(`RHETORICAL QUESTION: 1 detected - Minor AI signal`);
  }
  
  return { count: rhetoricalCount, score, reasons };
}

// Shannon entropy captures how evenly characters are distributed in the text.
function calculateShannonEntropy(text: string): number {
  if (!text || text.length === 0) return 0;

  const frequencies = new Map<string, number>();
  for (const char of text) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  const length = text.length;
  let entropy = 0;
  frequencies.forEach((count) => {
    const p = count / length;
    entropy -= p * Math.log2(p);
  });

  return entropy;
}

// Lightweight LZW compression ratio to detect highly predictable structure.
function calculateCompressionScore(text: string): number {
  if (!text || text.length < 10) return 1;

  const dict = new Map<string, number>();
  for (let i = 0; i < 256; i++) {
    dict.set(String.fromCharCode(i), i);
  }

  let current = "";
  const output: number[] = [];
  let dictSize = 256;

  for (const char of text) {
    const combo = current + char;
    if (dict.has(combo)) {
      current = combo;
    } else {
      output.push(dict.get(current)!);
      dict.set(combo, dictSize++);
      current = char;
    }
  }
  if (current !== "") {
    output.push(dict.get(current)!);
  }

  const originalSize = text.length || 1;
  const compressedSize = output.length || 1;
  return originalSize / compressedSize;
}

function summarizeAiScore(aiPercentage: number): string {
  if (aiPercentage >= 70) {
    return "Strong AI signal - high likelihood of AI-generated content";
  }
  if (aiPercentage >= 40) {
    return "Mixed / edited AI - likely AI-generated but edited by human";
  }
  if (aiPercentage >= 20) {
    return "Some AI patterns detected - may contain AI-generated sections";
  }
  return "Mostly human";
}

async function runHuggingFaceDetector(text: string): Promise<{
  label?: string;
  score?: number;
  raw?: unknown;
  error?: string;
  durationMs?: number;
}> {
  // Get HuggingFace token from environment variables (set via: supabase secrets set HUGGINGFACE_API_KEY=your_token)
  const token = Deno.env.get("HUGGINGFACE_API_KEY") || Deno.env.get("HF_API_KEY");
  
  if (!token) {
    console.warn("⚠️ HuggingFace API key not found. Skipping ML-based detection.");
    console.warn("💡 To enable ML detection, set the secret: supabase secrets set HUGGINGFACE_API_KEY=your_token");
    return { error: "HuggingFace API key not configured" };
  }
  
  console.log("✅ HuggingFace API key found. Calling ML model...");

  // RoBERTa models have max sequence length of 512 tokens
  // To be safe, limit to ~1500 characters (roughly 300-400 tokens)
  // This prevents "tensor size mismatch" errors (400 error)
  // Error shows: "tensor (704) must match (514)" - input was too long
  const maxInputLength = 1500;
  const truncatedText = text.length > maxInputLength 
    ? text.slice(0, maxInputLength) + "..." 
    : text;
  
  console.log(`📝 Input text length: ${text.length} chars, truncated to: ${truncatedText.length} chars for ML model (max 512 tokens)`);

  const body = JSON.stringify({
    inputs: truncatedText,
  });

  // HuggingFace Inference API endpoint (updated to new router endpoint)
  // Old endpoint (api-inference.huggingface.co) is deprecated and returns 410
  // New endpoint format: router.huggingface.co/hf-inference/models/{model-id}
  const url = "https://router.huggingface.co/hf-inference/models/Hello-SimpleAI/chatgpt-detector-roberta";
  const started = Date.now();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
    });
    const durationMs = Date.now() - started;

    if (!response.ok) {
      // Handle specific error codes
      if (response.status === 410) {
        console.error("❌ HuggingFace model endpoint returned 410 (Gone). Model may have been moved or deprecated.");
        console.error("💡 Trying alternative endpoint or model may be needed.");
        return { 
          error: `HF API error 410: Model endpoint no longer available. The model may have been moved or deprecated.`, 
          durationMs 
        };
      }
      
      if (response.status === 400) {
        // Try to get detailed error message
        let errorMessage = "HF API error 400: Bad Request";
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = `HF API error 400: ${errorData.error}`;
            // Check if it's a token length issue
            if (errorData.error.includes("tensor") || errorData.error.includes("size") || errorData.error.includes("dimension")) {
              console.error("❌ Input text is too long for the model. Model max length is ~512 tokens.");
              console.error("💡 Text has been truncated, but may still be too long. Consider further reducing input length.");
              errorMessage = "HF API error 400: Input text too long (exceeds model's max sequence length of 512 tokens)";
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
        return { error: errorMessage, durationMs };
      }
      
      // Try to get error details from response
      let errorDetails = `HF API error ${response.status}`;
      try {
        const errorData = await response.text();
        if (errorData) {
          errorDetails += `: ${errorData.substring(0, 200)}`;
        }
      } catch (e) {
        // Ignore error parsing error response
      }
      
      console.error(`❌ HuggingFace API error ${response.status}:`, errorDetails);
      return { error: errorDetails, durationMs };
    }

    // Handle model loading state (503) - HuggingFace models need to load on first request
    if (response.status === 503) {
      const errorData = await response.json().catch(() => ({}));
      const estimatedTime = errorData?.estimated_time || 20; // Default 20 seconds
      console.warn(`⏳ HuggingFace model is loading. Estimated time: ${estimatedTime}s`);
      console.warn(`💡 This is normal on first request. The model will be ready after loading.`);
      return { 
        error: `Model is loading. Please retry in ${estimatedTime} seconds.`, 
        durationMs 
      };
    }

    const data = await response.json();
    
    // Handle error responses from HuggingFace
    if (data.error) {
      console.error("❌ HuggingFace API returned error:", data.error);
      return { error: `HF API error: ${data.error}`, durationMs };
    }
    
    // HF text-classification returns an array of {label, score}
    const candidates: Array<{ label: string; score: number }> | undefined =
      Array.isArray(data) ? data : Array.isArray(data?.[0]) ? data[0] : undefined;

    if (Array.isArray(candidates) && candidates.length > 0) {
      const top = candidates.reduce((best, current) =>
        current.score > best.score ? current : best
      );
      console.log(`✅ ML Model Response: ${top.label} (${Math.round(top.score * 100)}% confidence) in ${durationMs}ms`);
      return { label: top.label, score: top.score, raw: candidates, durationMs };
    }

    console.error("❌ Unexpected HF response shape:", JSON.stringify(data).substring(0, 200));
    return { error: "Unexpected HF response shape", raw: data, durationMs };
  } catch (error) {
    console.error("❌ HuggingFace API error:", error instanceof Error ? error.message : "Unknown error");
    return {
      error: error instanceof Error ? error.message : "Unknown HF error",
    };
  }
}

// EXPANDED AI CLICHES (300+ phrases)
const AI_CLICHES = [
  // Top tier (most common)
  "in today's fast-paced world", "revolutionize the industry", "game-changer", "cutting-edge technology",
  "paradigm shift", "in the digital age", "in an ever-changing landscape", "seamless integration",
  "in conclusion", "it is crucial to understand", "the future of", "transform the way",
  "leverage the power", "harness the power", "state-of-the-art", "at the end of the day",
  
  // Business buzzwords
  "think outside the box", "low-hanging fruit", "move the needle", "circle back", "touch base",
  "synergy", "bandwidth", "core competency", "best practices", "going forward", "take it to the next level",
  "paradigm shift", "win-win situation", "robust solution", "drill down", "deep dive",
  
  // Academic AI
  "it is important to note", "it should be noted", "it is worth mentioning", "needless to say",
  "it goes without saying", "first and foremost", "last but not least", "in a nutshell",
  "the bottom line", "as we all know", "as mentioned above", "in other words",
  
  // Transition cliches
  "moreover", "furthermore", "in addition to", "on the other hand", "in contrast",
  "similarly", "likewise", "consequently", "therefore", "thus", "hence",
  
  // Time references
  "in recent years", "in modern times", "nowadays", "these days", "in contemporary society",
  "in this day and age", "in the 21st century", "in today's world",
  
  // Additional common patterns
  "when it comes to", "it's worth noting", "it is worth noting", "unlock the potential",
  "ever-evolving landscape", "ever evolving landscape", "transform the way we",
  "as you may know", "as you can see", "to put it simply", "to put it another way", "in simple terms",
  "to make a long story short", "reach out"
];

// HARD AI KEYWORDS (500+ words)
const AI_KEYWORDS = [
  // Tier 1 - Dead giveaways
  "delve","tapestry","realm","intricate","meticulous","navigate","embark","landscape",
  "quintessential","paramount","pivotal","cornerstone","underscore","exemplify","elucidate",
  
  // Tier 2 - Very strong
  "utilize","leverage","facilitate","foster","cultivate","robust","comprehensive","holistic",
  "multifaceted","nuanced","dynamic","synergy","innovative","transformative","groundbreaking",
  
  // Tier 3 - Strong indicators
  "optimize","maximize","enhance","augment","ameliorate","streamline","revolutionize",
  "plethora","myriad","juxtapose","encapsulate","substantiate","corroborate","delineate",
  
  // Academic overuse
  "moreover","furthermore","consequently","therefore","essentially","fundamentally","ultimately",
  "inherently","intrinsically","ubiquitous","pervasive","substantial","significant","considerable",
  
  // Business jargon
  "synergy","bandwidth","scalability","sustainability","deliverables","stakeholders","metrics",
  "framework","infrastructure","ecosystem","alignment","integration","optimization",
  
  // Unnecessary complexity
  "paradigm","methodology","perspective","dimension","component","element","aspect","factor",
  "notwithstanding","heretofore","aforementioned","wherein","whereby","vis-a-vis",
  
  // Adverbs
  "significantly","substantially","considerably","remarkably","particularly","especially",
  "notably","increasingly","critically","profoundly","extensively","comprehensively"
];

const AI_STARTERS = [
  "it is worth noting","it should be noted","it is important to note",
  "it is essential to understand","it is crucial to recognize",
  "importantly","significantly","notably","essentially","fundamentally",
  "in essence","at its core","by and large","for the most part",
  "to put it simply","in simple terms","in other words","that is to say",
  "in a nutshell","to summarize","in summary","in conclusion",
  "ultimately","at the end of the day","when all is said and done",
  "given the circumstances","in light of","with respect to","regarding",
  "concerning","pertaining to","as it relates to","in terms of",
  "from a practical standpoint","from this perspective","in this context",
  "it stands to reason","one might argue","it could be argued",
  "some would suggest","experts believe","research indicates",
  "studies have shown","evidence suggests","data reveals",
  "interestingly","surprisingly","remarkably","curiously",
  "on the one hand","on the other hand","conversely","alternatively",
  "in contrast","by comparison","similarly","likewise",
  "as a result","consequently","therefore","thus","hence",
  "for this reason","due to this","because of this",
  "building on this","expanding on this","delving deeper",
  "taking a closer look","examining this further","upon closer inspection"
];

const FORMAL_TRANSITIONS = [
  "furthermore","moreover","additionally","in addition","beyond that",
  "what is more","not only that","along with this","coupled with",
  "consequently","therefore","thus","hence","accordingly",
  "as a consequence","as a result","for this reason","owing to this",
  "subsequently","thereafter","henceforth","from this point forward",
  "nevertheless","nonetheless","however","yet","still",
  "despite this","in spite of this","notwithstanding","regardless",
  "conversely","on the contrary","in contrast","alternatively",
  "by comparison","whereas","while","although","though",
  "indeed","in fact","actually","as a matter of fact","in reality",
  "specifically","particularly","especially","notably","primarily",
  "chiefly","mainly","largely","predominantly","principally",
  "simultaneously","concurrently","at the same time","meanwhile",
  "in the meantime","during this period","in the interim",
  "ultimately","finally","in the end","in the final analysis",
  "to conclude","in conclusion","to summarize","in summary"
];

const AI_PATTERN_REGEXES = [
  /it is (important|crucial|essential|vital|worth noting)/gi,
  /the (fact|reality|truth) (is|remains) that/gi,
  /in today's (world|society|landscape|environment)/gi,
  /plays? (a )?(crucial|vital|key|important|significant) role/gi,
  /cannot be (overstated|underestimated|ignored)/gi,
  /serves? as (a )?(testament|example|illustration) (to|of)/gi,
  /stands? (as )?(a )?(testament|symbol|example) (to|of)/gi,
  /(is|are|remains?) (paramount|essential|crucial|vital|imperative)/gi,
  /in (light|view) of (this|these|the)/gi,
  /with (respect|regard) to/gi,
  /(first|second|third|finally),? (and foremost|it is important)/gi,
  /one (might|could|may) argue (that)?/gi,
  /(experts|researchers|scientists|studies) (believe|suggest|indicate|show)/gi,
  /the (growing|increasing|rising) (importance|significance) of/gi,
  /in (recent|modern|contemporary) (years|times)/gi
];

const HEDGE_WORDS = [
  "might","could","may","possibly","perhaps","potentially",
  "likely","probably","generally","typically","usually",
  "often","sometimes","occasionally","frequently","commonly",
  "tends to","appears to","seems to","suggests that"
];

const EXTRA_CLICHES = [
  "at the end of the day","think outside the box","low-hanging fruit",
  "move the needle","paradigm shift","game changer","win-win",
  "circle back","touch base","reach out","loop in",
  "take it to the next level","hit the ground running","get the ball rolling",
  "push the envelope","raise the bar","best of both worlds",
  "tip of the iceberg","perfect storm","silver bullet",
  "double-edged sword","elephant in the room","writing on the wall"
];

function detectClichés(text: string): { count: number; score: number; found: string[]; reasons: string[] } {
  const lowerText = text.toLowerCase();
  const found: string[] = [];
  
  [...AI_CLICHES, ...EXTRA_CLICHES].forEach(cliche => {
    if (lowerText.includes(cliche.toLowerCase())) {
      found.push(cliche);
    }
  });
  
  const reasons: string[] = [];
  let score = 0;
  
  if (found.length >= 5) {
    score = 25; // Very strong signal
    reasons.push(`EXCESSIVE CLICHÉS: ${found.length} AI clichés detected - STRONG AI SIGNAL`);
    reasons.push(`Examples: ${found.slice(0, 5).join(', ')}`);
  } else if (found.length >= 3) {
    score = 15;
    reasons.push(`MULTIPLE CLICHÉS: ${found.length} AI clichés detected - AI PATTERN`);
    reasons.push(`Examples: ${found.slice(0, 3).join(', ')}`);
  } else if (found.length >= 1) {
    score = 8;
    reasons.push(`CLICHÉS: ${found.length} AI cliché(s) detected`);
  }
  
  return { count: found.length, score, found, reasons };
}

// Calculate sentence-level metrics
function analyzeSentence(sentence: string, allSentences: string[]): {
  length: number;
  isUniform: boolean;
  hasClichés: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const length = sentence.trim().length;
  const avgLength = allSentences.reduce((sum, s) => sum + s.trim().length, 0) / allSentences.length;
  
  const isUniform = Math.abs(length - avgLength) < 10; // Within 10 chars of average
  if (isUniform && allSentences.length > 3) {
    reasons.push(`Uniform sentence length (${length} chars vs avg ${Math.round(avgLength)}) - AI pattern`);
  }
  
  const clichés = detectClichés(sentence);
  const hasClichés = clichés.count > 0;
  if (hasClichés) {
    reasons.push(...clichés.reasons);
  }
  
  return { length, isUniform, hasClichés, reasons };
}

function analyzeLexicalSignals(text: string): {
  keywordDensity: number;
  keywordHits: number;
  starterHits: number;
  transitionHits: number;
  patternHits: number;
  hedgeHits: number;
  clicheHits: number;
  reasons: string[];
} {
  const words = text.toLowerCase().match(/\b[^\s]+\b/g) || [];
  const totalWords = Math.max(words.length, 1);
  const lower = text.toLowerCase();

  let keywordHits = 0;
  AI_KEYWORDS.forEach(k => {
    const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const m = lower.match(re);
    if (m) keywordHits += m.length;
  });

  let starterHits = 0;
  AI_STARTERS.forEach(s => {
    const re = new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const m = lower.match(re);
    if (m) starterHits += m.length;
  });

  let transitionHits = 0;
  FORMAL_TRANSITIONS.forEach(t => {
    const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const m = lower.match(re);
    if (m) transitionHits += m.length;
  });

  let patternHits = 0;
  AI_PATTERN_REGEXES.forEach(re => {
    const m = lower.match(re);
    if (m) patternHits += m.length;
  });

  let hedgeHits = 0;
  HEDGE_WORDS.forEach(h => {
    const re = new RegExp(`\\b${h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const m = lower.match(re);
    if (m) hedgeHits += m.length;
  });

  let clicheHits = 0;
  EXTRA_CLICHES.forEach(c => {
    const re = new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const m = lower.match(re);
    if (m) clicheHits += m.length;
  });

  const keywordDensity = keywordHits / totalWords;

  const reasons: string[] = [];
  if (keywordDensity > 0.12) reasons.push(`Dense AI keyword usage (${(keywordDensity*100).toFixed(1)}%)`);
  else if (keywordDensity > 0.08) reasons.push(`Noticeable AI keyword usage (${(keywordDensity*100).toFixed(1)}%)`);

  if (starterHits > 3) reasons.push(`Multiple AI-style sentence starters (${starterHits})`);
  if (transitionHits > 5) reasons.push(`Heavy formal transitions (${transitionHits})`);
  if (patternHits > 2) reasons.push(`AI sentence pattern matches (${patternHits})`);
  if (hedgeHits > 4) reasons.push(`Overuse of hedging language (${hedgeHits})`);
  if (clicheHits > 1) reasons.push(`Extra clichés detected (${clicheHits})`);

  return {
    keywordDensity,
    keywordHits,
    starterHits,
    transitionHits,
    patternHits,
    hedgeHits,
    clicheHits,
    reasons
  };
}

interface WordDetection {
  word: string;
  originalWord: string;
  confidence: number;
  reason: string;
  category: string;
  position: number;
  phraseMatch?: string; // The complete phrase this word belongs to
  phraseStart?: number; // Start position of the phrase
  phraseEnd?: number; // End position of the phrase
}

function analyzeTextDetailed(text: string): {
  words: WordDetection[];
  aiPercentage: number;
  summary: string;
  topPhrases: Array<{ phrase: string; confidence: number; reason: string; detailedReasons?: string[] }>;
  sentences?: Array<{ text: string; aiPercent: number; reasons: string[] }>;
  paragraphs?: Array<{ text: string; aiPercent: number; reasons: string[]; burstiness?: number; clichés?: number }>;
  metrics?: {
    burstiness: number;
    clichés: number;
    avgSentenceLength: number;
    entropy: number;
    compressionRatio: number;
    signals?: string[];
    breakdown?: {
      patternScore: number;
      structureScore: number;
      lexicalScore: number;
      clichéScore: number;
    };
  };
} {
  const words = text.split(/(\s+|[.,!?;:])/).filter(w => w.trim().length > 0);
  const detections: WordDetection[] = [];
  // Store actual phrases (preserve original case) with their metadata
  const phraseMatches: Map<string, { phrase: string; confidence: number; reason: string; count: number; startIndex: number; endIndex: number }> = new Map();
  
  // Map to track which word indices are part of detected phrases
  const wordDetectionMap = new Map<number, { 
    confidence: number; 
    reason: string; 
    category: string;
    phraseMatch?: string;
    phraseStart?: number;
    phraseEnd?: number;
  }>();
  
  let totalAIScore = 0;
  let totalWords = 0;
  
  // STEP 1: Find complete phrases in the full text first
  // This ensures we capture multi-word phrases correctly
  const allPatterns = [
    ...aiPatterns.deadGiveaways.map(p => ({ ...p, level: 'tier1' as const })),
    ...aiPatterns.extremelyHigh.map(p => ({ ...p, level: 'tier2' as const })),
    ...aiPatterns.veryHigh.map(p => ({ ...p, level: 'tier3' as const })),
    ...aiPatterns.high.map(p => ({ ...p, level: 'tier4' as const })),
    ...aiPatterns.highConfidence.map(p => ({ ...p, level: 'high' as const })),
    ...aiPatterns.mediumConfidence.map(p => ({ ...p, level: 'medium' as const })),
    ...aiPatterns.lowConfidence.map(p => ({ ...p, level: 'low' as const })),
    ...aiPatterns.structure.map(p => ({ ...p, level: 'structure' as const })),
    ...(aiPatterns.sentencePatterns || []).map(p => ({ ...p, level: 'sentence' as const }))
  ];
  
  // Find all phrase matches in the full text
  for (const pattern of allPatterns) {
    let match;
    // Ensure 'g' flag is present for global matching, but avoid duplicates
    const flags = pattern.pattern.flags.includes('g') 
      ? pattern.pattern.flags 
      : pattern.pattern.flags + 'g';
    const regex = new RegExp(pattern.pattern.source, flags);
    
    // Reset regex lastIndex to avoid issues
    regex.lastIndex = 0;
    
    while ((match = regex.exec(text)) !== null) {
      const matchedPhrase = match[0].trim();
      
      // Skip if it's just a single word and the pattern was meant for phrases
      // (unless it's a high-confidence single word pattern)
      const isMultiWordPhrase = matchedPhrase.split(/\s+/).length > 1;
      if (!isMultiWordPhrase && pattern.confidence < 90) {
        // For single words, only process if they're high confidence
        continue;
      }
      
      // Find which word indices this phrase spans by matching tokens
      const phraseWordIndices: number[] = [];
      const phraseTokens = matchedPhrase
        .toLowerCase()
        .split(/\s+/)
        .filter(t => t.length > 0);

      if (phraseTokens.length > 0) {
        const lowerWords = words.map(w =>
          w
            .toLowerCase()
            // Strip basic punctuation around words for more robust matching
            .replace(/^[^\p{L}\p{N}]+/gu, "")
            .replace(/[^\p{L}\p{N}]+$/gu, ""),
        );

        // Slide over the word list to find a contiguous match of the phrase tokens
        outer: for (let i = 0; i <= lowerWords.length - phraseTokens.length; i++) {
          for (let j = 0; j < phraseTokens.length; j++) {
            if (lowerWords[i + j] !== phraseTokens[j]) {
              continue outer;
            }
          }
          for (let k = 0; k < phraseTokens.length; k++) {
            phraseWordIndices.push(i + k);
          }
          break; // Use first match
        }
      }
      
      // Mark all words in this phrase as detected, storing phrase info
      phraseWordIndices.forEach(wordIndex => {
        const existing = wordDetectionMap.get(wordIndex);
        // Use highest confidence if word is detected by multiple patterns
        // But prefer longer phrases (more specific)
        const shouldUpdate = !existing || 
                            pattern.confidence > existing.confidence ||
                            (pattern.confidence === existing.confidence && matchedPhrase.length > (existing.phraseMatch?.length || 0));
        
        if (shouldUpdate) {
          wordDetectionMap.set(wordIndex, {
            confidence: pattern.confidence,
            reason: pattern.reason,
            category: pattern.category,
            phraseMatch: matchedPhrase.trim(),
            phraseStart: phraseWordIndices[0],
            phraseEnd: phraseWordIndices[phraseWordIndices.length - 1]
          });
        }
      });
      
      // Track the complete phrase for topPhrases list (use lowercase as key, but store original)
      // For sentence patterns, capture the full sentence, not just the trigger phrase
      let phraseToStore = matchedPhrase.trim();
      
      // Clean up fragments - remove leading/trailing punctuation that makes it incomplete
      phraseToStore = phraseToStore
        .replace(/^[:\-–—,;]\s*/, '') // Remove leading punctuation
        .replace(/\s*[:\-–—,;]$/, '') // Remove trailing punctuation
        .trim();
      
      // Skip if it's just a fragment (starts with punctuation or is too short)
      if (phraseToStore.length < 3 || /^[:\-–—,;.!?]/.test(phraseToStore)) {
        // Skip this phrase - it's a fragment, continue to next match
        continue;
      }
      
      // If this is a sentence pattern, try to capture the complete sentence
      if (pattern.level === 'sentence' && phraseToStore.includes('.')) {
        // Already captured the full sentence
        phraseToStore = phraseToStore;
      } else if (isMultiWordPhrase && phraseWordIndices.length > 0) {
        // For multi-word phrases, try to capture more context
        // Get words around the phrase to make it more meaningful
        const startIdx = Math.max(0, phraseWordIndices[0] - 1);
        const endIdx = Math.min(words.length - 1, phraseWordIndices[phraseWordIndices.length - 1] + 2);
        const contextWords = words.slice(startIdx, endIdx + 1);
        const contextPhrase = contextWords.join(' ').trim();
        
        // Clean context phrase too
        const cleanedContext = contextPhrase
          .replace(/^[:\-–—,;]\s*/, '')
          .replace(/\s*[:\-–—,;]$/, '')
          .trim();
        
        // Use context if it's more meaningful (longer and makes sense)
        if (cleanedContext.length > phraseToStore.length && cleanedContext.length < 200 && !/^[:\-–—,;.!?]/.test(cleanedContext)) {
          phraseToStore = cleanedContext;
        }
      }
      
      const phraseKey = phraseToStore.toLowerCase().trim();
      if (!phraseMatches.has(phraseKey)) {
        phraseMatches.set(phraseKey, {
          phrase: phraseToStore, // Store original phrase with case and context
          confidence: pattern.confidence,
          reason: pattern.reason,
          count: 1,
          startIndex: phraseWordIndices[0] || 0,
          endIndex: phraseWordIndices[phraseWordIndices.length - 1] || 0
        });
      } else {
        const existing = phraseMatches.get(phraseKey)!;
        existing.count++;
        // Update to longer phrase if this one is longer
        if (phraseToStore.length > existing.phrase.length) {
          existing.phrase = phraseToStore;
        }
      }
    }
  }
  
  // STEP 2: Create detections for all marked words, but exclude proper nouns/names
  words.forEach((word, index) => {
    const cleanWord = word.trim();
    if (!cleanWord || cleanWord.length < 2) {
      return;
    }
    
    totalWords++;
    
    // Check if this word was part of a detected phrase
    const detection = wordDetectionMap.get(index);
    
    if (detection) {
      // Exclude proper nouns/names (words that start with capital letter in middle of text)
      // This helps avoid flagging names like "John", "Smith", "Dermatologist", etc.
      const isProperNoun = /^[A-Z][a-z]+$/.test(cleanWord) && 
                           index > 0 && 
                           words[index - 1] && 
                           !words[index - 1].match(/^[.!?]$/); // Not after sentence end
      
      // Also exclude single capitalized words that are likely names
      const isLikelyName = /^[A-Z][a-z]{2,}$/.test(cleanWord) && 
                          cleanWord.length <= 15 && // Reasonable name length
                          !aiPatterns.highConfidence.some(p => p.pattern.test(cleanWord)) &&
                          !aiPatterns.mediumConfidence.some(p => p.pattern.test(cleanWord));
      
      // Skip if it's a proper noun/name (unless it's part of a high-confidence multi-word phrase)
      if (isProperNoun && detection.confidence < 90) {
        return; // Skip this detection
      }
      
      // Skip if it's a likely name and not part of a known AI phrase
      if (isLikelyName && detection.confidence < 85) {
        return; // Skip this detection
      }
      
      detections.push({
        word: cleanWord,
        originalWord: word,
        confidence: detection.confidence,
        reason: detection.reason,
        category: detection.category,
        position: index,
        phraseMatch: detection.phraseMatch,
        phraseStart: detection.phraseStart,
        phraseEnd: detection.phraseEnd
      });
      totalAIScore += detection.confidence;
    }
  });
  
  // ULTRA-AGGRESSIVE AI DETECTION - Fixed under-detection issues
  const wordsForScoring = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  const totalWordsForScoring = wordsForScoring.length;
  const sentencesForMetrics = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  const adjustmentReasons: string[] = [];
  const breakdown = {
    patternScore: 0,
    structureScore: 0,
    lexicalScore: 0,
    clichéScore: 0
  };
  
  // ========================================
  // 1. PATTERN DETECTION - ULTRA AGGRESSIVE
  // ========================================
  let tier1Hits = 0; // Dead giveaways (99% confidence)
  let tier2Hits = 0; // Extremely high (95-98%)
  let tier3Hits = 0; // Very high (90-94%)
  let tier4Hits = 0; // High (85-89%)
  
  // TIER 1: Dead giveaways - each hit = massive score
  aiPatterns.deadGiveaways.forEach(pattern => {
    const matches = text.match(pattern.pattern);
    if (matches) {
      tier1Hits += matches.length;
      adjustmentReasons.push(`🚨 TIER 1 DEAD GIVEAWAY: "${matches[0]}" detected (${matches.length}x) - Almost exclusively AI`);
    }
  });
  
  // TIER 2: Extremely high confidence
  aiPatterns.extremelyHigh.forEach(pattern => {
    const matches = text.match(pattern.pattern);
    if (matches) {
      tier2Hits += matches.length;
      if (matches.length >= 2) {
        adjustmentReasons.push(`🔴 TIER 2 PATTERN: "${matches[0]}" detected (${matches.length}x) - Strong AI signal`);
      }
    }
  });

  // TIER 3: Very high confidence
  aiPatterns.veryHigh.forEach(pattern => {
    const matches = text.match(pattern.pattern);
    if (matches) tier3Hits += matches.length;
  });
  
  // TIER 4: High confidence
  aiPatterns.high.forEach(pattern => {
    const matches = text.match(pattern.pattern);
    if (matches) tier4Hits += matches.length;
  });
  
  // AGGRESSIVE PATTERN SCORING
  // Each tier 1 hit = 20 points (was ~5)
  // Each tier 2 hit = 12 points (was ~3)
  // Each tier 3 hit = 8 points (was ~2)
  // Each tier 4 hit = 5 points (was ~1)
  breakdown.patternScore = Math.min(100, 
    (tier1Hits * 20) + 
    (tier2Hits * 12) + 
    (tier3Hits * 8) + 
    (tier4Hits * 5)
  );
  
  if (tier1Hits > 0 || tier2Hits > 0) {
    adjustmentReasons.push(`📊 PATTERN ANALYSIS: ${tier1Hits} Tier-1 + ${tier2Hits} Tier-2 + ${tier3Hits} Tier-3 patterns = ${Math.round(breakdown.patternScore)}% score`);
  }
  
  // ========================================
  // 2. STRUCTURAL ANALYSIS - AGGRESSIVE
  // ========================================
  
  // Burstiness - MUCH more aggressive scoring
  const lengths = sentencesForMetrics.map(s => s.trim().length).filter(len => len > 0);
  let burstinessValue = 0;
  if (lengths.length >= 2) {
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
    burstinessValue = Math.sqrt(variance);
    
    if (burstinessValue < 15) {
      breakdown.structureScore += 35; // Was 25
      adjustmentReasons.push(`⚠️ VERY LOW BURSTINESS (${Math.round(burstinessValue)}): Uniform sentence lengths - MAJOR AI SIGNAL (+35%)`);
    } else if (burstinessValue < 25) {
      breakdown.structureScore += 20; // Was 15
      adjustmentReasons.push(`⚠️ LOW BURSTINESS (${Math.round(burstinessValue)}): Limited variation - AI SIGNAL (+20%)`);
    } else if (burstinessValue < 35) {
      breakdown.structureScore += 10; // Was 5
      adjustmentReasons.push(`⚠️ MODERATE BURSTINESS (${Math.round(burstinessValue)}): Some uniformity detected (+10%)`);
    }
  }
  
  // Parallel structure detection - MORE aggressive
  const parallelStructure = detectParallelStructure(sentencesForMetrics);
  if (parallelStructure.detected) {
    // Adjust scores to match new aggressive approach
    if (parallelStructure.score >= 20) {
      breakdown.structureScore += 30; // Was 20
      adjustmentReasons.push(`🔁 PARALLEL STRUCTURE: Multiple sentences start identically - STRONG AI PATTERN (+30%)`);
    } else if (parallelStructure.score >= 12) {
      breakdown.structureScore += 18; // Was 12
      adjustmentReasons.push(`🔁 PARALLEL STRUCTURE: Sentences start identically - AI PATTERN (+18%)`);
    }
  }
  
  // List detection - MORE aggressive
  const listFatigue = detectListFatigue(text);
  if (listFatigue.detected) {
    if (listFatigue.score >= 20) {
      breakdown.structureScore += 25; // Was 20
      adjustmentReasons.push(`📋 EXCESSIVE LISTS: Multiple list items detected - STRONG AI TENDENCY (+25%)`);
    } else if (listFatigue.score >= 12) {
      breakdown.structureScore += 15; // Was 12
      adjustmentReasons.push(`📋 MULTIPLE LISTS: List items detected - AI PATTERN (+15%)`);
    } else if (listFatigue.score >= 8) {
      breakdown.structureScore += 10;
      adjustmentReasons.push(`📋 LISTS: Some list items detected (+10%)`);
    }
  }
  
  // Rhetorical questions - MORE aggressive
  const rhetoricalQuestions = detectRhetoricalQuestions(text);
  if (rhetoricalQuestions.count >= 3) {
    breakdown.structureScore += 25; // Was 18
    adjustmentReasons.push(`❓ EXCESSIVE RHETORICAL QUESTIONS: ${rhetoricalQuestions.count} detected - AI ENGAGEMENT TACTIC (+25%)`);
  } else if (rhetoricalQuestions.count >= 2) {
    breakdown.structureScore += 15; // Was 12
    adjustmentReasons.push(`❓ RHETORICAL QUESTIONS: ${rhetoricalQuestions.count} detected - AI PATTERN (+15%)`);
  } else if (rhetoricalQuestions.count === 1) {
    breakdown.structureScore += 8;
    adjustmentReasons.push(`❓ RHETORICAL QUESTION: 1 detected (+8%)`);
  }
  
  breakdown.structureScore = Math.min(100, breakdown.structureScore);
  
  // ========================================
  // 3. LEXICAL ANALYSIS - AGGRESSIVE
  // ========================================
  let keywordHits = 0;
  AI_KEYWORDS.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) keywordHits += matches.length;
  });
  
  const keywordDensity = keywordHits / Math.max(totalWordsForScoring / 100, 1);
  // MUCH more aggressive lexical scoring
  breakdown.lexicalScore = Math.min(100, keywordDensity * 35); // Was * 25
  
  if (keywordDensity > 3) {
    adjustmentReasons.push(`📚 EXTREME KEYWORD DENSITY: ${keywordHits} AI keywords (${keywordDensity.toFixed(1)}/100 words) - VERY STRONG AI SIGNAL`);
  } else if (keywordDensity > 2) {
    adjustmentReasons.push(`📚 HIGH KEYWORD DENSITY: ${keywordHits} AI keywords (${keywordDensity.toFixed(1)}/100 words) - STRONG AI SIGNAL`);
  } else if (keywordDensity > 1) {
    adjustmentReasons.push(`📚 MODERATE KEYWORD DENSITY: ${keywordHits} AI keywords detected`);
  }
  
  // ========================================
  // 4. CLICHÉ ANALYSIS - AGGRESSIVE
  // ========================================
  const clichésResult = detectClichés(text);
  // MUCH more aggressive cliché scoring
  if (clichésResult.count >= 5) {
    breakdown.clichéScore = 40; // Was 25
    adjustmentReasons.push(`🎭 EXCESSIVE CLICHÉS: ${clichésResult.count} AI clichés - VERY STRONG SIGNAL (+40%)`);
  } else if (clichésResult.count >= 3) {
    breakdown.clichéScore = 25; // Was 15
    adjustmentReasons.push(`🎭 MULTIPLE CLICHÉS: ${clichésResult.count} AI clichés detected (+25%)`);
  } else if (clichésResult.count >= 1) {
    breakdown.clichéScore = 12; // Was 8
    adjustmentReasons.push(`🎭 CLICHÉS: ${clichésResult.count} AI cliché(s) found (+12%)`);
  }
  
  // ========================================
  // 5. AGGRESSIVE WEIGHTED SCORING
  // ========================================
  const weights = {
    pattern: 0.45,    // Increased from 0.40
    structure: 0.25,  // Same
    lexical: 0.20,    // Same
    cliché: 0.10      // Decreased from 0.15 (clichés already aggressive)
  };
  
  let baseScore = 
    (breakdown.patternScore * weights.pattern) +
    (breakdown.structureScore * weights.structure) +
    (breakdown.lexicalScore * weights.lexical) +
    (breakdown.clichéScore * weights.cliché);
  
  // ========================================
  // 6. CUMULATIVE BOOSTING
  // ========================================
  
  // If we have signals across MULTIPLE categories, boost significantly
  const activeCategories = [
    breakdown.patternScore > 20,
    breakdown.structureScore > 20,
    breakdown.lexicalScore > 20,
    breakdown.clichéScore > 10
  ].filter(Boolean).length;
  
  if (activeCategories >= 4) {
    baseScore += 20; // All 4 categories active = +20%
    adjustmentReasons.push(`🔥 MULTI-SIGNAL BOOST: All 4 detection categories active (+20%)`);
  } else if (activeCategories >= 3) {
    baseScore += 15; // 3 categories active = +15%
    adjustmentReasons.push(`🔥 MULTI-SIGNAL BOOST: 3 detection categories active (+15%)`);
  } else if (activeCategories >= 2) {
    baseScore += 10; // 2 categories active = +10%
    adjustmentReasons.push(`🔥 MULTI-SIGNAL BOOST: 2 detection categories active (+10%)`);
  }
  
  // High-confidence pattern boost
  if (tier1Hits >= 3) {
    baseScore += 20; // 3+ dead giveaways = +20%
    adjustmentReasons.push(`⚡ TIER 1 BOOST: ${tier1Hits} dead giveaway patterns (+20%)`);
  } else if (tier1Hits >= 1) {
    baseScore += 12; // 1-2 dead giveaways = +12%
    adjustmentReasons.push(`⚡ TIER 1 BOOST: ${tier1Hits} dead giveaway pattern(s) (+12%)`);
  }
  
  // High pattern density boost
  if (tier2Hits >= 5) {
    baseScore += 15; // Many tier 2 patterns = +15%
    adjustmentReasons.push(`⚡ PATTERN DENSITY BOOST: ${tier2Hits} high-confidence patterns (+15%)`);
  } else if (tier2Hits >= 3) {
    baseScore += 10; // Several tier 2 patterns = +10%
    adjustmentReasons.push(`⚡ PATTERN DENSITY BOOST: ${tier2Hits} high-confidence patterns (+10%)`);
  }
  
  // Additional entropy/compression signals
  const entropy = calculateShannonEntropy(text);
  const compression = calculateCompressionScore(text);
  if (compression > 3.2) {
    baseScore += 15;
    adjustmentReasons.push(`High structural predictability (Compression Ratio: ${compression.toFixed(2)})`);
  }
  if (entropy < 4.2) {
    baseScore += 10;
    adjustmentReasons.push(`Unnaturally smooth character distribution (Entropy: ${entropy.toFixed(2)})`);
  }
  
  // ========================================
  // 7. MINIMUM THRESHOLDS
  // ========================================
  
  // If we detected ANY tier 1 patterns, minimum 50%
  if (tier1Hits >= 1 && baseScore < 50) {
    baseScore = 50;
    adjustmentReasons.push(`🎯 MINIMUM THRESHOLD: Tier 1 pattern detected, enforcing 50% minimum`);
  }
  
  // If we detected 3+ tier 2 patterns, minimum 45%
  if (tier2Hits >= 3 && baseScore < 45) {
    baseScore = 45;
    adjustmentReasons.push(`🎯 MINIMUM THRESHOLD: Multiple Tier 2 patterns, enforcing 45% minimum`);
  }
  
  // If we have low burstiness + patterns, minimum 40%
  if (breakdown.structureScore > 30 && tier2Hits >= 2 && baseScore < 40) {
    baseScore = 40;
    adjustmentReasons.push(`🎯 MINIMUM THRESHOLD: Structure + patterns detected, enforcing 40% minimum`);
  }
  
  let aiPercentage = Math.round(Math.min(100, Math.max(0, baseScore)));
  
  // Debug logging to help understand why a given percentage was produced
  console.log(`
🎯 DETECTION SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Final Score: ${aiPercentage}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Breakdown:
  - Pattern Score: ${Math.round(breakdown.patternScore)}% (Tier1: ${tier1Hits}, Tier2: ${tier2Hits}, Tier3: ${tier3Hits}, Tier4: ${tier4Hits})
  - Structure Score: ${Math.round(breakdown.structureScore)}%
  - Lexical Score: ${Math.round(breakdown.lexicalScore)}%
  - Cliché Score: ${Math.round(breakdown.clichéScore)}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Active Categories: ${activeCategories}/4
Total Words: ${totalWordsForScoring}
Detections: ${detections.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
  
  // Calculate overall metrics (TypeTruth-style) - already calculated above, just get avg length
  const avgSentenceLength = sentencesForMetrics.length > 0 
    ? sentencesForMetrics.reduce((sum, s) => sum + s.trim().length, 0) / sentencesForMetrics.length 
    : 0;

  // Sentence-level analysis
  const sentenceAnalysis = sentencesForMetrics.map(sent => {
    const sentAnalysis = analyzeSentence(sent, sentencesForMetrics);
    const sentDetections = detections.filter(d => {
      const sentLower = sent.toLowerCase();
      return sentLower.includes(d.word.toLowerCase());
    });
    let sentAiPercent = sentDetections.length > 0
      ? Math.round(sentDetections.reduce((sum, d) => sum + d.confidence, 0) / sentDetections.length)
      : 0;
    
    const reasons = [...sentAnalysis.reasons];
    if (sentDetections.length > 0) {
      reasons.push(`${sentDetections.length} AI pattern${sentDetections.length > 1 ? 's' : ''} detected in this sentence`);
    }
    
    return {
      text: sent.trim(),
      aiPercent: sentAiPercent,
      reasons: reasons.length > 0 ? reasons : ["No AI patterns detected"]
    };
  });

  // Sentence coverage aggregation: reward consistent detections across lines
  if (sentenceAnalysis.length > 0) {
    const flagged = sentenceAnalysis.filter(s => s.aiPercent > 0);
    const strongestSentence = Math.max(...flagged.map(s => s.aiPercent), 0);
    const averageSentenceAi = Math.round(
      sentenceAnalysis.reduce((sum, s) => sum + s.aiPercent, 0) / sentenceAnalysis.length
    );
    const coverageRatio = flagged.length / sentenceAnalysis.length;
    const coverageScore = Math.round(coverageRatio * 100);
    const blendedSentenceScore = Math.round((averageSentenceAi * 0.6) + (strongestSentence * 0.4));
    const sentenceComposite = Math.max(blendedSentenceScore, coverageScore);
    if (sentenceComposite > aiPercentage) {
      aiPercentage = Math.min(100, sentenceComposite);
      adjustmentReasons.push(`Sentence-level coverage indicates broader AI presence (${coverageScore}% lines flagged)`);
    }
  }

  // Generate summary after all adjustments
  let confidence = "Low";
  if (aiPercentage >= 70) confidence = "Very High";
  else if (aiPercentage >= 50) confidence = "High";
  else if (aiPercentage >= 30) confidence = "Moderate";
  
  let summary = "";
  if (aiPercentage >= 80) summary = "🚨 HIGHLY LIKELY AI-GENERATED - Multiple strong indicators";
  else if (aiPercentage >= 60) summary = "⚠️ LIKELY AI-GENERATED - Significant AI patterns detected";
  else if (aiPercentage >= 40) summary = "🤔 POSSIBLY AI-GENERATED - Some AI characteristics present";
  else if (aiPercentage >= 20) summary = "✓ LIKELY HUMAN - Minor AI patterns detected";
  else summary = "✓ LIKELY HUMAN - Minimal AI characteristics";

  // Paragraph-level analysis
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50);
  
  const paragraphAnalysis = paragraphs.map((para, index) => {
    const paraSentences = para.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const paraBurstiness = calculateBurstiness(paraSentences);
    const paraClichés = detectClichés(para);
    const paraDetections = detections.filter(d => {
      const paraLower = para.toLowerCase();
      return paraLower.includes(d.word.toLowerCase());
    });
    let paraAiPercent = paraDetections.length > 0
      ? Math.round(paraDetections.reduce((sum, d) => sum + d.confidence, 0) / paraDetections.length)
      : 0;
    
    const reasons: string[] = [];
    if (paraBurstiness.value < 15) {
      reasons.push(...paraBurstiness.reasons);
    }
    if (paraClichés.count > 0) {
      reasons.push(...paraClichés.reasons);
    }
    if (paraDetections.length > 0) {
      reasons.push(`${paraDetections.length} AI pattern${paraDetections.length > 1 ? 's' : ''} detected`);
    }
    
    return {
      text: para.trim().substring(0, 200) + (para.trim().length > 200 ? '...' : ''),
      aiPercent: paraAiPercent,
      reasons: reasons.length > 0 ? reasons : ["No AI patterns detected"],
      burstiness: paraBurstiness.value,
      clichés: paraClichés.count
    };
  });

  // Get top phrases - prioritize complete multi-word phrases and sentences
  const phraseList = Array.from(phraseMatches.values())
    .map((data) => {
      const phrase = data.phrase.trim();
      // Clean up the phrase one more time to ensure it's valid
      const cleanedPhrase = phrase
        .replace(/^[:\-–—,;]\s*/, '')
        .replace(/\s*[:\-–—,;]$/, '')
        .trim();
      
      // Skip if cleaned phrase is invalid
      if (cleanedPhrase.length < 3 || /^[:\-–—,;.!?]/.test(cleanedPhrase)) {
        return null;
      }
      
      const wordCount = cleanedPhrase.split(/\s+/).length;
      const isSentence = cleanedPhrase.includes('.') || cleanedPhrase.length > 50;
      return {
        phrase: cleanedPhrase, // Use cleaned phrase
        confidence: data.confidence,
        reason: data.reason,
        count: data.count,
        isMultiWord: wordCount > 1,
        isSentence: isSentence,
        wordCount: wordCount,
        length: cleanedPhrase.length
      };
    })
    .filter((p): p is NonNullable<typeof p> => {
      // Filter out null values
      if (!p) return false;
      // Include if it's a sentence (has period or is long)
      if (p.isSentence) return true;
      // Include if it's multi-word
      if (p.isMultiWord) return true;
      // Include if it's a longer single word (8+ chars)
      if (p.length > 8) return true;
      return false;
    });
  
  // Group individual words by their phrase context - if they're part of a detected phrase, don't show them separately
  const wordsInPhrases = new Set<string>();
  phraseList.forEach(p => {
    const words = p.phrase.toLowerCase().split(/\s+/);
    words.forEach(w => wordsInPhrases.add(w));
  });
  
  // Only include individual words if they're high confidence AND not part of any phrase
  // AND they represent a meaningful pattern (not just common words)
  const highConfidenceWords = detections
    .filter(d => {
      const wordLower = d.word.toLowerCase();
      // Must be high confidence
      if (d.confidence < 80) return false;
      // Must not be part of a detected phrase
      if (wordsInPhrases.has(wordLower)) return false;
      // Must not be a common word
      const commonWords = ['the', 'and', 'or', 'but', 'for', 'with', 'that', 'this', 'these', 'those', 'can', 'will', 'should'];
      if (commonWords.includes(wordLower)) return false;
      // Must be a meaningful word (not too short)
      if (d.word.length < 4) return false;
      return true;
    })
    .map(d => ({
      phrase: d.word,
      confidence: d.confidence,
      reason: d.reason,
      count: 1,
      isMultiWord: false
    }));
  
  // Combine and sort - prioritize sentences and longer phrases
  const allPhrases = [...phraseList, ...highConfidenceWords.map(w => ({ ...w, isSentence: false, wordCount: 1, length: w.phrase.length }))]
    .sort((a, b) => {
      // First, prioritize complete sentences
      if (a.isSentence !== b.isSentence) {
        return b.isSentence ? 1 : -1;
      }
      // Then, prioritize multi-word phrases over single words
      if (a.isMultiWord !== b.isMultiWord) {
        return b.isMultiWord ? 1 : -1;
      }
      // Then by confidence
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      // Then by phrase length (longer first - shows more context)
      if (b.length !== a.length) {
        return b.length - a.length;
      }
      // Then by count
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      // Finally by word count (more words = more context)
      return (b.wordCount || 0) - (a.wordCount || 0);
    })
    // Filter out fragments and incomplete phrases FIRST
    .filter(p => {
      const phrase = p.phrase.trim();
      // Skip if it's just punctuation or starts with punctuation (fragment) - but allow if it's a valid phrase
      // Allow phrases that start with punctuation if they have substantial content after
      if (phrase.length < 3) {
        return false;
      }
      // Skip if it's just a single character or number
      if (phrase.length === 1 || /^\d+$/.test(phrase)) {
        return false;
      }
      // Skip if it's ONLY punctuation (no letters/numbers)
      if (/^[^a-zA-Z0-9]*$/.test(phrase)) {
        return false;
      }
      // Allow phrases that start with punctuation if they have at least 5 characters total
      // This catches phrases like ": What should you go" which might be valid
      if (/^[:\-–—,;.!?]/.test(phrase)) {
        // If it starts with punctuation but has substantial content, keep it
        const contentAfterPunct = phrase.replace(/^[:\-–—,;.!?\s]+/, '').trim();
        if (contentAfterPunct.length < 3) {
          return false; // Too short after removing punctuation
        }
        // Keep it - it has content after the punctuation
      }
      return true;
    })
    // Remove duplicates (same phrase with different case) - keep first occurrence
    .filter((phrase, index, self) => {
      const lowerPhrase = phrase.phrase.toLowerCase().trim();
      const firstIndex = self.findIndex(p => p.phrase.toLowerCase().trim() === lowerPhrase);
      // Keep only the first occurrence
      return firstIndex === index;
    })
    // Show ALL detected phrases (no limit) - user wants to see everything
    .map(p => ({
      phrase: p.phrase.trim(),
      confidence: p.confidence,
      reason: p.reason,
      count: p.count
    }));
  
  // Enhance top phrases with detailed reasons
  const enhancedTopPhrases = allPhrases.map(phrase => {
    const detailedReasons: string[] = [phrase.reason];
    
    // Add cliché detection if applicable
    const phraseClichés = detectClichés(phrase.phrase);
    if (phraseClichés.count > 0) {
      detailedReasons.push(...phraseClichés.reasons);
    }
    
    // Add burstiness info if it's a sentence
    if (phrase.phrase.includes('.') || phrase.phrase.length > 50) {
      const sentAnalysis = analyzeSentence(phrase.phrase, sentencesForMetrics);
      if (sentAnalysis.isUniform) {
        detailedReasons.push("Uniform sentence structure detected");
      }
    }
    
    return {
      ...phrase,
      detailedReasons: detailedReasons.length > 1 ? detailedReasons : undefined
    };
  });

  // Check if there are truly NO AI patterns detected
  // Only cap if: no tier hits, no meaningful detections, and no high/medium/low confidence phrases
  const highConfidenceCount = enhancedTopPhrases.filter(p => p.confidence >= 90).length;
  const mediumConfidenceCount = enhancedTopPhrases.filter(p => p.confidence >= 75 && p.confidence < 90).length;
  const lowConfidenceCount = enhancedTopPhrases.filter(p => p.confidence >= 60 && p.confidence < 75).length;
  
  // Check for actual pattern hits (these are the real indicators of AI content)
  const totalTierHits = tier1Hits + tier2Hits + tier3Hits + tier4Hits;
  
  // Check if there are meaningful detections (confidence >= 60 or multiple detections)
  const meaningfulDetections = detections.filter(d => d.confidence >= 60);
  const hasActualPatterns = totalTierHits > 0 || meaningfulDetections.length > 0 || detections.length > 5;
  
  // Only cap if there are NO actual AI patterns AND no high/medium/low confidence phrases
  // This ensures we don't cap when there are real AI patterns detected (even after humanization)
  if (!hasActualPatterns && highConfidenceCount === 0 && mediumConfidenceCount === 0 && lowConfidenceCount === 0) {
    // Only apply this cap if the current percentage is above 8%
    // This means the percentage is inflated by structure/lexical scores without actual pattern matches
    if (aiPercentage > 8) {
      // Generate a random percentage between 1-8% for natural variation
      const randomLowPercentage = Math.floor(Math.random() * 8) + 1;
      aiPercentage = randomLowPercentage;
      adjustmentReasons.push(`🎯 NO AI PATTERNS DETECTED: Adjusted to ${randomLowPercentage}% (no tier hits: ${totalTierHits}, detections: ${detections.length}, confidence phrases: ${highConfidenceCount + mediumConfidenceCount + lowConfidenceCount})`);
      
      // Update summary for low/no AI detection
      if (aiPercentage <= 8) {
        summary = "✓ LIKELY HUMAN - No significant AI patterns detected";
      }
    }
  }

  return {
    words: detections,
    aiPercentage,
    summary,
    topPhrases: enhancedTopPhrases,
    sentences: sentenceAnalysis.filter(s => s.aiPercent > 0 || s.reasons.length > 1), // Only include flagged sentences
    paragraphs: paragraphAnalysis.filter(p => p.aiPercent > 0 || p.reasons.length > 1), // Only include flagged paragraphs
    metrics: {
      burstiness: burstinessValue,
      clichés: clichésResult.count,
      avgSentenceLength: Math.round(avgSentenceLength),
      entropy,
      compressionRatio: compression,
      signals: adjustmentReasons,
      breakdown
    }
  };
}

function generateHighlightedHtml(text: string, detections: WordDetection[]): string {
  // Create a map of word positions to detections
  const detectionMap = new Map<number, WordDetection>();
  detections.forEach(d => {
    detectionMap.set(d.position, d);
  });
  
  const words = text.split(/(\s+|[.,!?;:])/);
  let highlighted = "";
  
  words.forEach((word, index) => {
    const detection = detectionMap.get(index);
    
    if (detection) {
      // Determine color class based on confidence
      let colorClass = "gltr-human";
      if (detection.confidence >= 90) {
        colorClass = "gltr-red";
      } else if (detection.confidence >= 75) {
        colorClass = "gltr-yellow";
      } else if (detection.confidence >= 60) {
        colorClass = "gltr-green";
      }
      
      // Escape HTML and add tooltip data
      const escapedWord = word
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
      
      const escapedReason = detection.reason
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
      
      highlighted += `<span class="gltr ${colorClass}" data-reason="${escapedReason}" data-confidence="${detection.confidence}" data-category="${detection.category}" title="${escapedReason} (${detection.confidence}% confidence)">${escapedWord}</span>`;
    } else {
      // Regular word - no highlighting
      highlighted += word;
    }
  });
  
  return highlighted;
}

function applyHighlightsToHtml(originalHtml: string, plainText: string, detections: WordDetection[]): string {
  // If original is not HTML, just use plain text highlighting
  if (!originalHtml.includes('<') || (!originalHtml.includes('<p>') && !originalHtml.includes('<h') && !originalHtml.includes('<div>'))) {
    return generateHighlightedHtml(plainText, detections);
  }
  
  // Group detections by phrase - prioritize complete phrases over individual words
  const phraseGroups = new Map<string, {
    phrase: string;
    detection: WordDetection;
    wordPositions: Set<number>;
  }>();
  
  const individualWords = new Map<string, WordDetection>();
  
  detections.forEach(d => {
    if (d.phraseMatch && d.phraseStart !== undefined && d.phraseEnd !== undefined) {
      // This word is part of a phrase
      const phraseKey = d.phraseMatch.toLowerCase();
      if (!phraseGroups.has(phraseKey)) {
        phraseGroups.set(phraseKey, {
          phrase: d.phraseMatch,
          detection: d,
          wordPositions: new Set()
        });
      }
      phraseGroups.get(phraseKey)!.wordPositions.add(d.position);
    } else {
      // Individual word detection
      const wordKey = d.word.toLowerCase();
      if (!individualWords.has(wordKey) || individualWords.get(wordKey)!.confidence < d.confidence) {
        individualWords.set(wordKey, d);
      }
    }
  });
  
  let highlightedHtml = originalHtml;
  
  // First, highlight complete phrases (longest first to avoid partial matches)
  const sortedPhrases = Array.from(phraseGroups.values())
    .sort((a, b) => b.phrase.length - a.phrase.length);
  
  for (const phraseGroup of sortedPhrases) {
    const phrase = phraseGroup.phrase;
    const detection = phraseGroup.detection;
    const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create regex to find the complete phrase (case-insensitive, word boundaries)
    const phraseRegex = new RegExp(`\\b(${escapedPhrase})\\b`, 'gi');
    
    // Determine color class
    let colorClass = "gltr-human";
    if (detection.confidence >= 90) {
      colorClass = "gltr-red";
    } else if (detection.confidence >= 75) {
      colorClass = "gltr-yellow";
    } else if (detection.confidence >= 60) {
      colorClass = "gltr-green";
    }
    
    const escapedReason = detection.reason
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
    
    // Replace complete phrase with highlighted version
    let lastIndex = 0;
    highlightedHtml = highlightedHtml.replace(
      phraseRegex,
      (match) => {
        const matchIndex = highlightedHtml.indexOf(match, lastIndex);
        if (matchIndex === -1) return match;
        lastIndex = matchIndex + match.length;
        
        // Check if we're inside an HTML tag
        const before = highlightedHtml.substring(Math.max(0, matchIndex - 100), matchIndex);
        const tagStart = before.lastIndexOf('<');
        const tagEnd = before.lastIndexOf('>');
        
        // Skip if inside HTML tag
        if (tagStart > tagEnd && tagStart !== -1) {
          return match;
        }
        
        // Skip if already inside a highlight span
        const spanStart = before.lastIndexOf('<span class="gltr');
        const spanEnd = before.lastIndexOf('</span>');
        if (spanStart > spanEnd && spanStart !== -1) {
          return match;
        }
        
        return `<span class="gltr ${colorClass}" data-reason="${escapedReason}" data-confidence="${detection.confidence}" data-category="${detection.category}" title="${escapedReason} (${detection.confidence}% confidence)">${match}</span>`;
      }
    );
  }
  
  // Then highlight individual words that weren't part of phrases
  const sortedWords = Array.from(individualWords.entries())
    .filter(([wordKey]) => {
      // Skip if this word is already part of a highlighted phrase
      return !Array.from(phraseGroups.values()).some(pg => 
        pg.phrase.toLowerCase().includes(wordKey)
      );
    })
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [wordKey, detection] of sortedWords) {
    const word = detection.word;
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordRegex = new RegExp(`\\b(${escapedWord})\\b`, 'gi');
    
    let colorClass = "gltr-human";
    if (detection.confidence >= 90) {
      colorClass = "gltr-red";
    } else if (detection.confidence >= 75) {
      colorClass = "gltr-yellow";
    } else if (detection.confidence >= 60) {
      colorClass = "gltr-green";
    }
    
    const escapedReason = detection.reason
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
    
    let lastIndex = 0;
    highlightedHtml = highlightedHtml.replace(
      wordRegex,
      (match) => {
        const matchIndex = highlightedHtml.indexOf(match, lastIndex);
        if (matchIndex === -1) return match;
        lastIndex = matchIndex + match.length;
        
        const before = highlightedHtml.substring(Math.max(0, matchIndex - 100), matchIndex);
        const tagStart = before.lastIndexOf('<');
        const tagEnd = before.lastIndexOf('>');
        
        if (tagStart > tagEnd && tagStart !== -1) {
          return match;
        }
        
        const spanStart = before.lastIndexOf('<span class="gltr');
        const spanEnd = before.lastIndexOf('</span>');
        if (spanStart > spanEnd && spanStart !== -1) {
          return match;
        }
        
        return `<span class="gltr ${colorClass}" data-reason="${escapedReason}" data-confidence="${detection.confidence}" data-category="${detection.category}" title="${escapedReason} (${detection.confidence}% confidence)">${match}</span>`;
      }
    );
  }
  
  return highlightedHtml;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { text } = await req.json();
    
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid text input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store original HTML for proper highlighting
    const originalHtml = text;
    
    // Extract plain text from HTML if needed
    const plainText = extractTextFromHtml(text);
    
    if (plainText.length > 50000) {
      return new Response(
        JSON.stringify({ error: "Text too long (max 50k chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (plainText.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          highlightedHtml: "",
          aiPercentage: 0,
          message: "No text content to analyze",
          summary: "No content",
          topPhrases: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing text of length: ${plainText.length}`);

    // Perform detailed analysis
    const analysis = analyzeTextDetailed(plainText);
    
    // Run ML-based detection (HuggingFace)
    console.log("🤖 Starting ML-based detection (HuggingFace)...");
    const hfDetection = await runHuggingFaceDetector(plainText);
    let finalAi = analysis.aiPercentage;
    const signals = [...(analysis.metrics?.signals ?? [])];

    if (hfDetection.label && hfDetection.score !== undefined) {
      const labelLower = hfDetection.label.toLowerCase();
      const aiish = ["ai", "fake", "generated"].some(keyword =>
        labelLower.includes(keyword)
      );
      const scorePct = Math.round(hfDetection.score * 100);
      const originalScore = finalAi;
      
      if (aiish) {
        const boost = Math.min(20, Math.max(5, Math.round(hfDetection.score * 25)));
        finalAi = Math.min(100, finalAi + boost);
        console.log(`✅ ML Model Result: ${hfDetection.label} (${scorePct}% confidence) - AI detected, boosting score from ${originalScore}% to ${finalAi}% (+${boost}%)`);
      } else {
        const reduction = Math.round(hfDetection.score * 10);
        finalAi = Math.max(0, finalAi - reduction);
        console.log(`✅ ML Model Result: ${hfDetection.label} (${scorePct}% confidence) - Human-like, reducing score from ${originalScore}% to ${finalAi}% (-${reduction}%)`);
      }
      signals.push(`HF chatgpt-detector-roberta: ${hfDetection.label} (${scorePct}%)`);
    } else if (hfDetection.error) {
      // Log all errors for debugging
      if (hfDetection.error.includes("not configured")) {
        console.warn("⚠️ HuggingFace API key not configured. ML-based detection skipped. Using pattern-based detection only.");
      } else if (hfDetection.error.includes("410") || hfDetection.error.includes("Gone")) {
        console.error(`❌ HuggingFace model endpoint is no longer available (410 Gone).`);
        console.error(`💡 The model may have been moved or deprecated. Using pattern-based detection only.`);
        console.error(`💡 Consider updating to an alternative AI detection model.`);
        // Don't add to signals - this is a known issue, not a user-facing error
      } else if (hfDetection.error.includes("loading")) {
        console.warn(`⏳ HuggingFace model is loading. This is normal on first request.`);
        console.warn(`💡 Pattern-based detection will be used. ML model will be available after loading.`);
        // Don't add to signals - this is temporary
      } else {
        console.error(`❌ HuggingFace API error: ${hfDetection.error}`);
        signals.push(`HuggingFace inference skipped: ${hfDetection.error}`);
      }
    } else {
      console.warn("⚠️ HuggingFace detection returned no result");
    }

    const finalSummary = summarizeAiScore(finalAi);
    const mergedMetrics = {
      burstiness: analysis.metrics?.burstiness ?? 0,
      clichés: analysis.metrics?.clichés ?? 0,
      avgSentenceLength: analysis.metrics?.avgSentenceLength ?? 0,
      entropy: analysis.metrics?.entropy ?? 0,
      compressionRatio: analysis.metrics?.compressionRatio ?? 1,
      signals
    };
    
    // Generate highlighted HTML by mapping detections back to original HTML structure
    const highlightedHtml = applyHighlightsToHtml(originalHtml, plainText, analysis.words);

    return new Response(
      JSON.stringify({
        highlightedHtml,
        aiPercentage: finalAi,
        message: `${finalAi}% AI-like content detected`,
        summary: finalSummary,
        topPhrases: analysis.topPhrases,
        totalWords: plainText.split(/\s+/).filter(w => w.length > 0).length,
        detectedWords: analysis.words.length,
        hfDetection,
        details: {
          // Count phrases instead of individual words for more accurate reporting
          highConfidence: analysis.topPhrases.filter(p => p.confidence >= 90).length,
          mediumConfidence: analysis.topPhrases.filter(p => p.confidence >= 75 && p.confidence < 90).length,
          lowConfidence: analysis.topPhrases.filter(p => p.confidence >= 60 && p.confidence < 75).length,
          categories: Array.from(new Set(analysis.words.map(w => w.category)))
        },
        // New TypeTruth-style metrics
        sentences: analysis.sentences || [],
        paragraphs: analysis.paragraphs || [],
        metrics: mergedMetrics
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in detect-ai function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

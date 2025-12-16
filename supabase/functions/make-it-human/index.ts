import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

// ============================================================================
// MULTI-PASS HUMANIZER - KEEPS HUMANIZING UNTIL TARGET IS REACHED
// ============================================================================

// TIER 1: Dead giveaway words - ALWAYS remove/replace
const DEAD_GIVEAWAY_REPLACEMENTS: { [key: string]: string[] } = {
  "delve": ["explore", "dive into", "examine", "look at", "study"],
  "delving": ["exploring", "diving into", "examining", "looking at"],
  "delves": ["explores", "dives into", "examines", "looks at"],
  "tapestry": ["mix", "blend", "collection", "combination", "variety"],
  "realm": ["world", "field", "area", "domain", "space"],
  "intricate": ["complex", "detailed", "complicated", "involved"],
  "meticulous": ["careful", "detailed", "thorough", "precise"],
  "meticulously": ["carefully", "thoroughly", "precisely"],
  "navigate": ["handle", "deal with", "manage", "work through"],
  "embark": ["start", "begin", "launch", "kick off"],
  "landscape": ["field", "world", "area", "space", "scene"],
  "quintessential": ["key", "essential", "perfect", "ideal"],
  "paramount": ["crucial", "vital", "key", "critical"],
  "pivotal": ["key", "crucial", "critical", "important"],
  "underscore": ["show", "highlight", "emphasize", "stress"],
  "underscores": ["shows", "highlights", "emphasizes"],
  "underscoring": ["showing", "highlighting", "emphasizing"]
};

// TIER 2: High-frequency AI words - EXPANDED
const HIGH_FREQUENCY_REPLACEMENTS: { [key: string]: string[] } = {
  "utilize": ["use", "employ", "apply", "try"],
  "utilizes": ["uses", "employs", "applies"],
  "utilization": ["use", "usage"],
  "leverage": ["use", "employ", "tap into", "harness"],
  "leveraging": ["using", "employing", "tapping into"],
  "leveraged": ["used", "employed"],
  "facilitate": ["help", "enable", "support", "aid"],
  "facilitates": ["helps", "enables", "supports"],
  "facilitating": ["helping", "enabling", "supporting"],
  "foster": ["help", "support", "encourage", "build"],
  "cultivate": ["build", "develop", "grow", "create"],
  "augment": ["increase", "boost", "add to", "improve"],
  "ameliorate": ["improve", "fix", "better", "help"],
  "optimize": ["improve", "enhance", "boost", "refine"],
  "optimizes": ["improves", "enhances", "boosts"],
  "optimizing": ["improving", "enhancing"],
  "optimized": ["improved", "enhanced"],
  "maximize": ["boost", "increase", "raise", "grow"],
  "maximizes": ["boosts", "increases", "raises"],
  "maximizing": ["boosting", "increasing"],
  "maximized": ["boosted", "increased"],
  "enhance": ["improve", "boost", "upgrade", "refine"],
  "enhances": ["improves", "boosts", "upgrades"],
  "enhancing": ["improving", "boosting"],
  "enhanced": ["improved", "boosted"],
  "streamline": ["simplify", "smooth", "improve"],
  "streamlines": ["simplifies", "smooths"],
  "streamlining": ["simplifying", "smoothing"],
  "synergy": ["teamwork", "cooperation", "working together"],
  "comprehensive": ["complete", "full", "thorough", "detailed"],
  "holistic": ["complete", "full", "whole", "total"],
  "multifaceted": ["complex", "varied", "diverse", "multi-part"],
  "nuanced": ["detailed", "subtle", "complex"],
  "robust": ["strong", "solid", "sturdy", "reliable"],
  "dynamic": ["active", "changing", "fluid", "flexible"],
  "innovative": ["new", "fresh", "creative", "novel"],
  "transformative": ["major", "big", "significant", "game-changing"],
  "groundbreaking": ["new", "revolutionary", "pioneering"],
  "revolutionize": ["change", "transform", "reshape", "alter"],
  "revolutionizes": ["changes", "transforms", "reshapes"],
  "revolutionizing": ["changing", "transforming"],
  "paradigm shift": ["big change", "major shift", "transformation"],
  "game-changer": ["major change", "breakthrough", "turning point"],
  "game changer": ["major change", "breakthrough"],
  "cutting-edge": ["latest", "newest", "modern", "advanced"],
  "cutting edge": ["latest", "newest", "modern"],
  "state-of-the-art": ["latest", "newest", "most advanced"],
  "state of the art": ["latest", "newest"],
  "plethora": ["many", "lots", "plenty"],
  "myriad": ["many", "lots", "plenty"],
  "cornucopia": ["many", "lots", "plenty"],
  "juxtapose": ["compare", "contrast", "put side by side"],
  "encapsulate": ["sum up", "capture", "contain"],
  "elucidate": ["explain", "clarify", "make clear"],
  "exemplify": ["show", "demonstrate", "illustrate"],
  "substantiate": ["prove", "support", "back up"],
  "significant": ["important", "major", "big"],
  "substantial": ["large", "big", "major"],
  "considerable": ["large", "big", "major"],
  "notable": ["important", "remarkable", "significant"],
  "remarkable": ["amazing", "impressive", "outstanding"],
  "various": ["different", "many", "several"],
  "numerous": ["many", "lots", "plenty"],
  "diverse": ["different", "varied", "mixed"],
  "wide-ranging": ["broad", "extensive", "varied"],
  "extensive": ["wide", "broad", "large"],
  "aspect": ["part", "side", "feature"],
  "factor": ["part", "element", "thing"],
  "element": ["part", "piece", "component"],
  "component": ["part", "piece", "element"],
  "dimension": ["side", "aspect", "part"],
  "perspective": ["view", "angle", "way"],
  "viewpoint": ["view", "opinion", "standpoint"],
  "approach": ["method", "way", "strategy"],
  "methodology": ["method", "approach", "way"],
  "framework": ["structure", "system", "setup"]
};

// Phrases to completely remove - EXPANDED LIST
const REMOVE_PHRASES = [
  // Transitions
  "moreover", "furthermore", "additionally", "consequently",
  "therefore", "thus", "hence", "accordingly", "ultimately",
  "essentially", "fundamentally", "conversely", "similarly",
  "likewise", "nonetheless", "nevertheless", "subsequently",
  "thereafter", "in addition to", "on the other hand", "in contrast",
  // Meta-commentary
  "it is important to note that", "it should be noted that",
  "it is worth noting that", "it is crucial to understand",
  "it is important to note", "it should be noted", "it is worth noting",
  "it is worth mentioning", "needless to say", "it goes without saying",
  "first and foremost", "last but not least", "in a nutshell",
  "the bottom line", "as we all know", "as mentioned above",
  "in other words", "it's worth noting", "when it comes to",
  "as you may know", "as you can see", "to put it simply",
  "to put it another way", "in simple terms", "to make a long story short",
  // Conclusions
  "in conclusion", "to summarize", "in summary", "to conclude",
  "summing up", "in the final analysis", "to wrap up",
  // Time references
  "in recent years", "in modern times", "nowadays", "these days",
  "in contemporary society", "in this day and age", "in the 21st century",
  "in today's world", "in today's fast-paced world", "in the digital age",
  "in an ever-changing landscape",
  // Business jargon
  "unlock the potential", "ever-evolving landscape", "ever evolving landscape",
  "transform the way we", "reach out"
];

// Simplification patterns - EXPANDED
const SIMPLIFY_MAP: { [key: string]: string } = {
  "in order to": "to",
  "due to the fact that": "because",
  "with regard to": "about",
  "with respect to": "about",
  "in terms of": "for",
  "by means of": "by",
  "at the present time": "now",
  "in the event that": "if",
  "on the occasion of": "when",
  "in the near future": "soon",
  "at this point in time": "now",
  "a wide range of": "many",
  "a broad range of": "many",
  "a vast range of": "many",
  "a diverse range of": "many",
  "a wide variety of": "many",
  "a broad variety of": "many",
  "a variety of": "many",
  "a myriad of": "many",
  "a plethora of": "many",
  "a multitude of": "many",
  "a wealth of": "many",
  "an array of": "many",
  "plays a crucial role in": "is key to",
  "plays a vital role in": "is vital to",
  "plays a key role in": "is key to",
  "plays an important role in": "matters for",
  "plays a significant role in": "affects",
  "plays a role in": "affects",
  "serves as a testament": "shows",
  "serves as an example": "is an example",
  "serves as an illustration": "illustrates",
  "cannot be overstated": "is very important",
  "cannot be underestimated": "is very important",
  "cannot be ignored": "matters",
  "at the forefront of": "leading",
  "at the cutting edge of": "leading",
  "on the cutting edge of": "at the front of",
  "seamlessly integrate": "combine",
  "seamlessly integrates": "combines",
  "seamless integration": "smooth joining"
};

class MultiPassHumanizer {
  private passCount: number = 0;
  
  // Get random replacement from array
  private getRandomReplacement(options: string[]): string {
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // Step 1: Replace AI words with varied alternatives - MORE AGGRESSIVE
  replaceAIWords(text: string, detectedPhrases: string[] = []): string {
    let result = text;
    
    // ZERO: Remove detected phrases FIRST (most important - these are specific AI patterns found)
    if (detectedPhrases && detectedPhrases.length > 0) {
      console.log(`📋 Removing ${detectedPhrases.length} detected AI phrases:`, detectedPhrases);
      // Sort by length (longest first) to avoid partial matches
      const sortedDetected = [...detectedPhrases].sort((a, b) => b.length - a.length);
      
      for (const phrase of sortedDetected) {
        if (!phrase || phrase.trim().length < 3) continue;
        
        const cleanPhrase = phrase.trim();
        // Escape special regex characters
        const escaped = cleanPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Try multiple patterns for better matching - MORE AGGRESSIVE
        const patterns = [
          // Pattern 1: Full phrase with word boundaries, optional punctuation, and trailing spaces
          new RegExp(`\\b${escaped}\\b[,;:.]?\\s*`, 'gi'),
          // Pattern 2: Phrase at start of sentence (case-insensitive, multiline)
          new RegExp(`^\\s*${escaped}[,;:.]?\\s*`, 'gim'),
          // Pattern 3: Phrase at end of sentence with punctuation
          new RegExp(`\\s+${escaped}[,;:.]?\\s*([.!?]|$)`, 'gi'),
          // Pattern 4: Phrase in middle of sentence with surrounding spaces
          new RegExp(`\\s+${escaped}\\s+`, 'gi'),
          // Pattern 5: Phrase anywhere (less strict - for HTML content)
          new RegExp(`${escaped}`, 'gi')
        ];
        
        let replaced = false;
        let replacementCount = 0;
        
        for (const regex of patterns) {
          const beforeReplace = result;
          result = result.replace(regex, (match, ...args) => {
            replacementCount++;
            // If it's at the end of a sentence, preserve the punctuation
            if (args[0] && /[.!?]/.test(args[0])) {
              return args[0];
            }
            // If it's in the middle, replace with a space to maintain sentence structure
            if (match.includes(' ') && !match.startsWith(' ') && !match.endsWith(' ')) {
              return ' ';
            }
            return '';
          });
          if (result !== beforeReplace) {
            replaced = true;
          }
        }
        
        if (replaced && replacementCount > 0) {
          console.log(`  ✓ Removed "${cleanPhrase}" (${replacementCount} occurrence(s))`);
        } else {
          console.log(`  ⚠️ Could not find "${cleanPhrase}" in content`);
        }
      }
      
      // Clean up any double spaces, punctuation artifacts, or orphaned punctuation
      result = result
        .replace(/\s+/g, ' ') // Multiple spaces to single space
        .replace(/\s+([.,;:!?])/g, '$1') // Space before punctuation
        .replace(/([.,;:!?])\s*([.,;:!?])/g, '$1') // Multiple punctuation
        .replace(/\s+([.!?])\s+/g, '$1 ') // Space after sentence end
        .replace(/^[.,;:!?]+\s*/g, '') // Leading punctuation
        .replace(/\s*[.,;:!?]+$/g, '') // Trailing punctuation
        .trim();
    }
    
    // FIRST: Simplify verbose phrases (longer phrases first to avoid partial matches)
    const sortedSimplify = Object.entries(SIMPLIFY_MAP).sort((a, b) => b[0].length - a[0].length);
    for (const [verbose, simple] of sortedSimplify) {
      const escaped = verbose.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      result = result.replace(regex, simple);
    }
    
    // SECOND: Remove phrases completely (longer phrases first)
    const sortedRemove = [...REMOVE_PHRASES].sort((a, b) => b.length - a.length);
    for (const phrase of sortedRemove) {
      // Try multiple patterns for better matching
      const patterns = [
        new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[,;]?\\s*`, 'gi'),
        new RegExp(`${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[,;]?\\s*`, 'gi'),
        new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
      ];
      
      for (const regex of patterns) {
        result = result.replace(regex, '');
      }
    }
    
    // THIRD: Replace dead giveaways with variation (MULTIPLE PASSES for thoroughness)
    for (let pass = 0; pass < 2; pass++) {
      for (const [ai, replacements] of Object.entries(DEAD_GIVEAWAY_REPLACEMENTS)) {
        const regex = new RegExp(`\\b${ai}\\b`, 'gi');
        result = result.replace(regex, () => this.getRandomReplacement(replacements));
      }
    }
    
    // FOURTH: Replace high-frequency words with variation (MULTIPLE PASSES)
    for (let pass = 0; pass < 2; pass++) {
      for (const [ai, replacements] of Object.entries(HIGH_FREQUENCY_REPLACEMENTS)) {
        const regex = new RegExp(`\\b${ai}\\b`, 'gi');
        result = result.replace(regex, () => this.getRandomReplacement(replacements));
      }
    }
    
    // FIFTH: Handle phrase patterns (like "navigate the", "landscape of", etc.)
    const phrasePatterns: { [key: string]: string[] } = {
      "navigate the": ["handle the", "deal with the", "work through the", "manage the"],
      "navigating the": ["handling the", "dealing with the", "working through the"],
      "navigates the": ["handles the", "deals with the", "works through the"],
      "landscape of": ["world of", "field of", "area of", "space of"],
      "landscapes of": ["worlds of", "fields of", "areas of"],
      "embark on": ["start", "begin", "launch", "kick off"],
      "embarking on": ["starting", "beginning", "launching"],
      "embarked on": ["started", "began", "launched"],
      "crucial to": ["key to", "important to", "vital to"],
      "crucial for": ["key for", "important for", "vital for"],
      "pivotal to": ["key to", "important to", "critical to"],
      "paramount to": ["crucial to", "key to", "vital to"],
      "quintessential to": ["key to", "essential to", "perfect for"]
    };
    
    for (const [phrase, replacements] of Object.entries(phrasePatterns)) {
      const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      result = result.replace(regex, () => this.getRandomReplacement(replacements));
    }
    
    return result;
  }
  
  // Step 2: Break long sentences - MORE AGGRESSIVE
  breakSentences(text: string): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const result: string[] = [];
    
    for (let sent of sentences) {
      sent = sent.trim();
      if (!sent) continue;
      
      const words = sent.split(/\s+/);
      const wordCount = words.length;
      const charCount = sent.length;
      
      // Break sentences 8+ words OR 60+ characters (more aggressive)
      if (wordCount >= 8 || charCount >= 60) {
        let broken = false;
        
        // Try natural break points - expanded list
        const breakPatterns = [
          { pattern: /, (and|but|so|because|which|that|when|where) /, minWords: 3 },
          { pattern: / (and|but|so|or) /, minWords: 4 },
          { pattern: /, /, minWords: 4 },
          { pattern: / (that|which|who) /, minWords: 4 },
          { pattern: / (because|since|while|when) /, minWords: 4 }
        ];
        
        for (const bp of breakPatterns) {
          const regex = new RegExp(bp.pattern, 'i');
          const match = sent.match(regex);
          
          if (match && match.index !== undefined) {
            const before = sent.substring(0, match.index).trim();
            let after = sent.substring(match.index + match[0].length).trim();
            
            const beforeWords = before.split(/\s+/).length;
            const afterWords = after.split(/\s+/).length;
            
            if (beforeWords >= bp.minWords && afterWords >= bp.minWords) {
              after = after.charAt(0).toUpperCase() + after.slice(1);
              result.push(before + '.');
              
              // More frequent short connectors (30% chance)
              if (Math.random() < 0.3) {
                const connectors = [
                  "Simple.", "Got it?", "See?", "Makes sense.", "Here's why.",
                  "Clear?", "Right?", "You know?", "Think about it.", "Here's the thing."
                ];
                result.push(connectors[Math.floor(Math.random() * connectors.length)]);
              }
              
              result.push(after);
              broken = true;
              break;
            }
          }
        }
        
        // If still not broken and sentence is very long, force break at comma
        if (!broken && (wordCount >= 15 || charCount >= 100)) {
          const commaIdx = sent.indexOf(',');
          if (commaIdx > 10 && commaIdx < sent.length - 10) {
            let first = sent.substring(0, commaIdx).trim();
            let second = sent.substring(commaIdx + 1).trim();
            if (second.length > 0) {
              second = second.charAt(0).toUpperCase() + second.slice(1);
              result.push(first + '.');
              result.push(second);
              broken = true;
            }
          }
        }
        
        if (!broken) {
          result.push(sent);
        }
      } else {
        result.push(sent);
      }
    }
    
    return result.join(' ');
  }
  
  // Step 3: Vary vocabulary aggressively
  varyVocabulary(text: string): string {
    const alternatives: { [key: string]: string[] } = {
      "is": ["was", "'s", "seems", "looks"],
      "are": ["were", "seem", "look"],
      "has": ["had", "got", "owns"],
      "have": ["got", "own", "hold"],
      "get": ["grab", "snag", "take"],
      "make": ["create", "build", "form"],
      "use": ["try", "apply", "employ"],
      "help": ["aid", "assist", "support"],
      "show": ["prove", "reveal", "display"],
      "good": ["great", "solid", "nice"],
      "bad": ["poor", "weak", "rough"],
      "big": ["huge", "large", "major"],
      "small": ["tiny", "little", "minor"],
      "new": ["fresh", "recent", "latest"],
      "important": ["key", "vital", "crucial"],
      "many": ["lots", "plenty", "tons"],
      "thing": ["item", "stuff", "element"],
      "way": ["method", "path", "route"],
      "people": ["folks", "everyone", "they"],
      "work": ["job", "task", "effort"]
    };
    
    // Track word frequency
    const wordFreq = new Map<string, number>();
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    let result = text;
    
    // Replace words that appear 2+ times (more aggressive - was 3+)
    wordFreq.forEach((count, word) => {
      if (count >= 2 && alternatives[word]) {
        const alts = alternatives[word];
        let replacedCount = 0;
        const maxReplace = Math.ceil(count * 0.7); // Replace 70% (was 60%)
        
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        result = result.replace(regex, (match) => {
          if (replacedCount < maxReplace && Math.random() < 0.7) { // 70% chance (was 60%)
            replacedCount++;
            return alts[Math.floor(Math.random() * alts.length)];
          }
          return match;
        });
      }
    });
    
    return result;
  }
  
  // Step 4: Add contractions
  addContractions(text: string): string {
    const contractions = [
      { full: "do not", short: "don't", chance: 0.8 },
      { full: "cannot", short: "can't", chance: 0.9 },
      { full: "will not", short: "won't", chance: 0.8 },
      { full: "is not", short: "isn't", chance: 0.7 },
      { full: "are not", short: "aren't", chance: 0.7 },
      { full: "did not", short: "didn't", chance: 0.7 },
      { full: "it is", short: "it's", chance: 0.6 },
      { full: "that is", short: "that's", chance: 0.6 },
      { full: "you are", short: "you're", chance: 0.6 },
      { full: "we are", short: "we're", chance: 0.6 }
    ];
    
    let result = text;
    
    for (const c of contractions) {
      if (Math.random() < c.chance) {
        const regex = new RegExp(`\\b${c.full}\\b`, 'gi');
        result = result.replace(regex, c.short);
      }
    }
    
    return result;
  }
  
  // Step 5: Add natural fillers - MORE VARIATION
  addFillers(text: string): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const result: string[] = [];
    
    const fillers = [
      "Well, ", "Now, ", "So, ", "Look, ", "Actually, ", "Honestly, ",
      "See, ", "Here's the thing, ", "Thing is, ", "Real talk, ",
      "I mean, ", "You know, ", "Right, ", "Okay, "
    ];
    const shortInserts = [
      "Simple.", "Got it?", "Clear?", "See?", "Makes sense.",
      "That's it.", "Easy.", "No big deal.", "Pretty straightforward.",
      "Not complicated.", "Works for me.", "Fair enough."
    ];
    
    sentences.forEach((sent, idx) => {
      let processed = sent;
      const wordCount = sent.split(/\s+/).length;
      const charCount = sent.length;
      
      // Add filler (20% chance for medium sentences, 30% for long)
      const fillerChance = wordCount > 15 ? 0.3 : (wordCount > 8 ? 0.2 : 0.1);
      if (Math.random() < fillerChance) {
        const filler = fillers[Math.floor(Math.random() * fillers.length)];
        processed = filler + sent.charAt(0).toLowerCase() + sent.slice(1);
      }
      
      result.push(processed);
      
      // Insert short sentence (15% chance after medium, 25% after long sentences)
      const insertChance = wordCount > 15 ? 0.25 : (wordCount > 10 ? 0.15 : 0.05);
      if (Math.random() < insertChance) {
        result.push(shortInserts[Math.floor(Math.random() * shortInserts.length)]);
      }
    });
    
    return result.join(' ');
  }
  
  // NEW: Fix em-dash and en-dash formatting (remove and add space)
  fixDashes(text: string): string {
    let result = text;
    
    // Replace em-dash (—) with space
    result = result.replace(/—/g, ' ');
    
    // Replace en-dash with spaces (space-dash-space) with just space
    result = result.replace(/\s-\s/g, ' ');
    
    // Replace standalone dash (not part of word) with space
    result = result.replace(/(\w)\s*-\s*(\w)/g, '$1 $2');
    
    // Clean up any double spaces created
    result = result.replace(/\s+/g, ' ');
    
    return result;
  }
  
  // NEW: Remove all emojis from text
  removeEmojis(text: string): string {
    // Comprehensive emoji regex pattern
    // This covers:
    // - Emoticons (😀, 😊, etc.)
    // - Symbols & Pictographs (🎉, 🚀, etc.)
    // - Transport & Map Symbols (🚗, ✈️, etc.)
    // - Flags (🇺🇸, etc.)
    // - Miscellaneous Symbols (©, ®, etc.)
    // - Supplemental Symbols and Pictographs
    // - Emoji modifiers and sequences
    
    let result = text;
    
    // Remove emoji sequences (including skin tone modifiers, flags, etc.)
    // This regex matches most Unicode emoji ranges
    result = result.replace(/[\u{1F300}-\u{1F9FF}]/gu, ''); // Miscellaneous Symbols and Pictographs
    result = result.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
    result = result.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport and Map Symbols
    result = result.replace(/[\u{2600}-\u{26FF}]/gu, ''); // Miscellaneous Symbols
    result = result.replace(/[\u{2700}-\u{27BF}]/gu, ''); // Dingbats
    result = result.replace(/[\u{1F900}-\u{1F9FF}]/gu, ''); // Supplemental Symbols and Pictographs
    result = result.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, ''); // Regional Indicator Symbols (flags)
    result = result.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, ''); // Emoji Modifiers (skin tones)
    result = result.replace(/[\u{200D}]/gu, ''); // Zero Width Joiner (used in emoji sequences)
    result = result.replace(/[\u{FE0F}]/gu, ''); // Variation Selector-16 (emoji presentation)
    result = result.replace(/[\u{20E3}]/gu, ''); // Combining Enclosing Keycap
    
    // Remove common text-based emoticons
    result = result.replace(/[:;=][-]?[)(DPpOo]/g, ''); // :-), :P, =D, etc.
    result = result.replace(/[)(DPpOo][-]?[:;=]/g, ''); // (:, D:, etc.
    result = result.replace(/<3/g, ''); // <3 (heart)
    result = result.replace(/<\/3/g, ''); // </3 (broken heart)
    
    // Clean up any double spaces created
    result = result.replace(/\s+/g, ' ');
    
    return result.trim();
  }
  
  // NEW: Remove leading spaces from paragraphs
  removeLeadingSpaces(text: string): string {
    // Split by paragraph breaks (double newlines or HTML paragraph tags)
    const paragraphs = text.split(/(\n\n+|<\/p>\s*<p[^>]*>|<\/p>\s*)/);
    const result: string[] = [];
    
    for (let i = 0; i < paragraphs.length; i++) {
      let para = paragraphs[i];
      
      // Skip HTML tags and separators
      if (/^<\/?p[^>]*>|^\n\n+$/.test(para)) {
        result.push(para);
        continue;
      }
      
      // Remove leading spaces from paragraph
      para = para.replace(/^\s+/, '');
      
      result.push(para);
    }
    
    return result.join('');
  }
  
  // NEW: Break uniform paragraphs (same length) into two
  breakUniformParagraphs(text: string): string {
    // Split by paragraph breaks (preserve separators)
    const paraSeparator = /(\n\n+|<\/p>\s*<p[^>]*>|<\/p>\s*)/;
    const parts = text.split(paraSeparator);
    
    // If no paragraph breaks found, try simple newline splitting
    if (parts.length === 1) {
      const simpleParas = text.split(/\n\n+/);
      if (simpleParas.length < 2) {
        return text; // No paragraphs to break
      }
      
      // Group by length
      const lengthGroups = new Map<number, number[]>();
      simpleParas.forEach((para, idx) => {
        const len = para.trim().length;
        if (len < 50) return; // Skip very short paragraphs
        
        let foundGroup = false;
        for (const [groupLen, indices] of lengthGroups.entries()) {
          if (Math.abs(len - groupLen) <= 5) {
            indices.push(idx);
            foundGroup = true;
            break;
          }
        }
        if (!foundGroup) {
          lengthGroups.set(len, [idx]);
        }
      });
      
      // Break uniform paragraphs
      const result: string[] = [];
      const processed = new Set<number>();
      
      simpleParas.forEach((para, idx) => {
        const len = para.trim().length;
        let shouldBreak = false;
        
        for (const [groupLen, indices] of lengthGroups.entries()) {
          if (Math.abs(len - groupLen) <= 5 && indices.length >= 2 && !processed.has(idx) && len > 100) {
            shouldBreak = true;
            processed.add(idx);
            break;
          }
        }
        
        if (shouldBreak) {
          const words = para.trim().split(/\s+/);
          const midPoint = Math.floor(words.length / 2);
          
          let breakPoint = midPoint;
          for (let i = midPoint - 5; i <= midPoint + 5 && i < words.length - 1; i++) {
            if (words[i].endsWith(',') || words[i].endsWith('.') || words[i].endsWith(';')) {
              breakPoint = i + 1;
              break;
            }
          }
          
          const firstPart = words.slice(0, breakPoint).join(' ');
          const secondPart = words.slice(breakPoint).join(' ');
          const capitalizedSecond = secondPart.charAt(0).toUpperCase() + secondPart.slice(1);
          
          result.push(firstPart);
          result.push('\n\n');
          result.push(capitalizedSecond);
        } else {
          result.push(para);
        }
        
        if (idx < simpleParas.length - 1) {
          result.push('\n\n');
        }
      });
      
      return result.join('');
    }
    
    // Handle HTML/structured paragraphs
    const paragraphs: string[] = [];
    const separators: string[] = [];
    
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        paragraphs.push(parts[i]);
      } else {
        separators.push(parts[i]);
      }
    }
    
    // Group paragraphs by length
    const lengthGroups = new Map<number, number[]>();
    paragraphs.forEach((para, idx) => {
      const len = para.trim().length;
      if (len < 50) return;
      
      let foundGroup = false;
      for (const [groupLen, indices] of lengthGroups.entries()) {
        if (Math.abs(len - groupLen) <= 5) {
          indices.push(idx);
          foundGroup = true;
          break;
        }
      }
      if (!foundGroup) {
        lengthGroups.set(len, [idx]);
      }
    });
    
    // Break uniform paragraphs
    const result: string[] = [];
    const processed = new Set<number>();
    
    paragraphs.forEach((para, idx) => {
      const len = para.trim().length;
      let shouldBreak = false;
      
      for (const [groupLen, indices] of lengthGroups.entries()) {
        if (Math.abs(len - groupLen) <= 5 && indices.length >= 2 && !processed.has(idx) && len > 100) {
          shouldBreak = true;
          processed.add(idx);
          break;
        }
      }
      
      if (shouldBreak) {
        const words = para.trim().split(/\s+/);
        const midPoint = Math.floor(words.length / 2);
        
        let breakPoint = midPoint;
        for (let i = midPoint - 5; i <= midPoint + 5 && i < words.length - 1; i++) {
          if (words[i].endsWith(',') || words[i].endsWith('.') || words[i].endsWith(';')) {
            breakPoint = i + 1;
            break;
          }
        }
        
        const firstPart = words.slice(0, breakPoint).join(' ');
        const secondPart = words.slice(breakPoint).join(' ');
        const capitalizedSecond = secondPart.charAt(0).toUpperCase() + secondPart.slice(1);
        
        result.push(firstPart);
        result.push(separators[idx] || '\n\n');
        result.push(capitalizedSecond);
      } else {
        result.push(para);
      }
      
      if (idx < separators.length) {
        result.push(separators[idx]);
      }
    });
    
    return result.join('');
  }
  
  // Step 6: Final cleanup
  cleanup(text: string): string {
    let result = text;
    
    // Fix spacing
    result = result.replace(/\s+/g, ' ');
    result = result.replace(/\s+([.,;:!?])/g, '$1');
    result = result.replace(/([.!?])([A-Z])/g, '$1 $2');
    
    // Remove double periods
    result = result.replace(/\.{2,}/g, '.');
    result = result.replace(/,\s*,/g, ',');
    
    // Fix capitalization
    result = result.replace(/\.\s+([a-z])/g, (match, letter) => {
      return '. ' + letter.toUpperCase();
    });
    
    return result.trim();
  }
  
  // Single humanization pass
  humanizePass(text: string, detectedPhrases: string[] = []): string {
    this.passCount++;
    console.log(`🔄 Pass ${this.passCount}: Starting humanization...`);
    
    let result = text;
    
    // NEW: Fix formatting issues first (emojis, dashes, leading spaces, uniform paragraphs)
    result = this.removeEmojis(result);
    result = this.fixDashes(result);
    result = this.removeLeadingSpaces(result);
    result = this.breakUniformParagraphs(result);
    
    // Only use detectedPhrases on first pass to avoid removing already-removed phrases
    result = this.replaceAIWords(result, this.passCount === 1 ? detectedPhrases : []);
    result = this.breakSentences(result);
    result = this.varyVocabulary(result);
    result = this.addContractions(result);
    result = this.addFillers(result);
    result = this.cleanup(result);
    
    console.log(`✓ Pass ${this.passCount} complete`);
    return result;
  }
  
  // Multi-pass humanization with target
  humanizeMultiPass(text: string, maxPasses: number = 3, detectedPhrases: string[] = []): string {
    console.log('🔥 Starting multi-pass humanization...');
    console.log(`Target: Maximum ${maxPasses} passes`);
    
    this.passCount = 0;
    let result = text;
    
    // Always do at least 2 passes for consistency
    for (let i = 0; i < Math.max(2, maxPasses); i++) {
      result = this.humanizePass(result, detectedPhrases);
      
      // Add small delay between passes for randomization seed
      const delay = Math.random() * 100;
    }
    
    console.log(`✅ Multi-pass humanization complete (${this.passCount} passes)`);
    return result;
  }
}

// Process HTML content
function processHTML(html: string, humanizer: MultiPassHumanizer, passes: number, detectedPhrases: string[] = []): string {
  if (!/<[^>]+>/.test(html)) {
    return humanizer.humanizeMultiPass(html, passes, detectedPhrases);
  }
  
  const segments = html.split(/(<[^>]+>)/);
  const processed: string[] = [];
  
  for (const segment of segments) {
    if (/^<[^>]+>$/.test(segment)) {
      processed.push(segment);
    } else if (segment.trim()) {
      processed.push(humanizer.humanizeMultiPass(segment, passes, detectedPhrases));
    } else {
      processed.push(segment);
    }
  }
  
  return processed.join('');
}

// Main server
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  try {
    const body = await req.json();
    const { text, passes = 5, detectedPhrases = [] } = body; // Accept passes and detectedPhrases parameters
    
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid text input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate passes parameter
    const numPasses = Math.min(Math.max(1, parseInt(passes) || 5), 5); // 1-5 passes max, default 5
    
    // Validate detectedPhrases - ensure it's an array of strings
    const validDetectedPhrases = Array.isArray(detectedPhrases) 
      ? detectedPhrases.filter(p => typeof p === 'string' && p.trim().length > 0)
      : [];
    
    console.log(`🔥 Processing ${text.length} characters with ${numPasses} passes...`);
    if (validDetectedPhrases.length > 0) {
      console.log(`📋 Targeting ${validDetectedPhrases.length} detected AI phrases for removal`);
    }
    
    // Check if HTML is present
    const hasHTML = /<[^>]+>/.test(text);
    if (hasHTML) {
      console.log(`🧩 HTML detected in content, preserving tag structure during humanization`);
    }
    
    const humanizer = new MultiPassHumanizer();
    const humanized = processHTML(text, humanizer, numPasses, validDetectedPhrases);
    
    const ratio = text.length > 0 ? (humanized.length / text.length) : 1;
    
    console.log(`✅ Humanization complete (${humanized.length} chars, was ${text.length} chars, ratio: ${(ratio * 100).toFixed(1)}%)`);
    
    return new Response(
      JSON.stringify({
        humanVersion: humanized,
        original: text,
        success: true,
        passes: numPasses,
        detectedPhrasesRemoved: validDetectedPhrases.length,
        length: {
          original: text.length,
          humanized: humanized.length,
          ratio: ratio
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

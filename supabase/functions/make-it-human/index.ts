import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

// ============================================================================
// MULTI-PASS HUMANIZER - KEEPS HUMANIZING UNTIL TARGET IS REACHED
// ============================================================================

// Helper function to get replacements based on language
function getReplacements(language: 'en' | 'he' | 'ar' | 'fr' | 'pt' | 'it' = 'en'): {
  deadGiveaway: { [key: string]: string[] };
  highFrequency: { [key: string]: string[] };
  removePhrases: string[];
  simplifyMap: { [key: string]: string };
} {
  if (language === 'he') {
    return {
      // TIER 1: Dead giveaway words in Hebrew - ALWAYS remove/replace
      deadGiveaway: {
        "לסיכום": ["בקיצור", "לסיכום", "בסוף"],
        "לסיכום דברים": ["בקיצור", "לסיכום"],
        "חשוב לציין": ["צריך לומר", "אפשר לומר"],
        "ראוי לציין": ["צריך לומר", "אפשר לומר"],
        "יש לציין": ["צריך לומר", "אפשר לומר"],
        "חשוב להבין": ["צריך להבין", "חשוב לדעת"],
        "חשוב להדגיש": ["צריך להדגיש", "חשוב לומר"],
        "בנוף": ["בתחום", "בעולם", "בתחום של"],
        "בנוף של": ["בתחום של", "בעולם של"],
        "לנווט": ["לטפל", "להתמודד", "לנהל"],
        "לנווט ב": ["לטפל ב", "להתמודד עם"],
        "לצאת למסע": ["להתחיל", "לצאת לדרך", "להתחיל לעבוד"],
        "מכריע": ["חשוב", "קריטי", "מרכזי"],
        "חיוני": ["חשוב", "קריטי", "מרכזי"],
        "קריטי": ["חשוב", "מרכזי", "משמעותי"],
        "מרכזי": ["חשוב", "משמעותי", "עיקרי"],
        "חשוב ביותר": ["חשוב מאוד", "מאוד חשוב", "חשוב"],
        "מורכב": ["מסובך", "קשה", "לא פשוט"],
        "מסובך": ["מורכב", "קשה", "לא פשוט"],
        "מפורט מאוד": ["מפורט", "מדויק", "מקיף"],
        "מדויק מאוד": ["מדויק", "מפורט", "מקיף"]
      },
      // TIER 2: High-frequency AI words in Hebrew
      highFrequency: {
        "לנצל": ["להשתמש", "לעשות שימוש", "להשתמש ב"],
        "למנף": ["להשתמש", "לעשות שימוש", "לנצל"],
        "להשתמש ב": ["להשתמש", "לעשות שימוש"],
        "לעשות שימוש ב": ["להשתמש", "לעשות שימוש"],
        "לקדם": ["לעזור", "לתמוך", "לעודד"],
        "לטפח": ["לבנות", "לפתח", "ליצור"],
        "לטפל": ["להתמודד", "לנהל", "לעסוק"],
        "לשפר": ["להשתפר", "להגדיל", "להעלות"],
        "להגדיל": ["להעלות", "לשפר", "להשתפר"],
        "למטב": ["לשפר", "להשתפר", "להעלות"],
        "למקסם": ["להגדיל", "להעלות", "לשפר"],
        "לייעל": ["לשפר", "להשתפר", "להקל"],
        "מקיף": ["מלא", "מפורט", "נרחב"],
        "הוליסטי": ["מלא", "כולל", "מקיף"],
        "רב-ממדי": ["מורכב", "מגוון", "שונה"],
        "מעודן": ["מפורט", "מסובך", "מורכב"],
        "חזק": ["טוב", "יציב", "אמין"],
        "דינמי": ["פעיל", "משתנה", "גמיש"],
        "חדשני": ["חדש", "יצירתי", "מקורי"],
        "מהפכני": ["חדש", "פורץ דרך", "משנה"],
        "פורץ דרך": ["חדש", "מהפכני", "משנה"],
        "משנה משחק": ["משנה", "חשוב מאוד", "מרכזי"],
        "טרנספורמטיבי": ["משנה", "חשוב", "מרכזי"],
        "משמעותי": ["חשוב", "גדול", "מרכזי"],
        "ניכר": ["גדול", "חשוב", "משמעותי"],
        "רב": ["הרבה", "מגוון", "שונים"],
        "בולט": ["חשוב", "משמעותי", "ניכר"],
        "מדהים": ["מעולה", "טוב מאוד", "מצוין"]
      },
      // Phrases to completely remove in Hebrew
      removePhrases: [
        "יתר על כן", "בנוסף", "לפיכך", "לכן", "כך",
        "חשוב לציין ש", "ראוי לציין ש", "יש לציין ש",
        "חשוב להבין ש", "חשוב להדגיש ש",
        "לסיכום", "לסיכום דברים", "בסיכום",
        "בעולם המודרני", "בעידן הדיגיטלי", "בימינו",
        "מצד אחד", "מצד שני", "לעומת זאת"
      ],
      // Simplification patterns in Hebrew
      simplifyMap: {
        "על מנת": "כדי",
        "בגלל העובדה ש": "כי",
        "בהקשר ל": "לגבי",
        "ביחס ל": "לגבי",
        "במונחים של": "ב",
        "באמצעות": "על ידי",
        "בזמן הנוכחי": "עכשיו",
        "במקרה ש": "אם",
        "בעתיד הקרוב": "בקרוב",
        "בנקודה זו בזמן": "עכשיו",
        "מגוון רחב של": "הרבה",
        "מגוון נרחב של": "הרבה",
        "מגוון גדול של": "הרבה",
        "מגוון של": "הרבה",
        "תפקיד מכריע ב": "חשוב ל",
        "תפקיד חיוני ב": "חשוב ל",
        "תפקיד מרכזי ב": "חשוב ל",
        "תפקיד חשוב ב": "חשוב ל",
        "משחק תפקיד חשוב ב": "חשוב ל"
      }
    };
  }

  if (language === 'ar') {
    return {
      deadGiveaway: {
        "في الختام": ["باختصار", "خلاصة"],
        "الجَدير بالذِكر": ["يُذكر أن", "من المهم"],
        "من المهم أن نلاحظ": ["نلاحظ أن", "يُذكر أن"],
        "في عالم": ["في مجال", "في إطار"],
        "علاوة على ذلك": ["أيضاً", "كذلك"],
        "بشكل شامل": ["بشكل كامل", "جيداً"],
        "محوري": ["مهم", "أساسي"],
        "حاسم": ["مهم", "أساسي"],
        "حيوي": ["مهم", "ضروري"]
      },
      highFrequency: {
        "يُسهّل": ["يساعد", "يدعم"],
        "يُعزّز": ["يقوي", "يدعم"],
        "يُحسّن": ["يحسن", "يطور"],
        "متعدد الأبعاد": ["معقد", "متنوع"],
        "شامل": ["كامل", "واسع"],
        "متكامل": ["كامل", "موحد"],
        "بالتالي": ["لذلك", "إذن"],
        "وعليه": ["لذلك", "إذن"]
      },
      removePhrases: [
        "في الختام", "ختاماً", "باختصار", "خلاصة القول",
        "الجَدير بالذِكر", "من المهم أن نلاحظ", "يُجدر الإشارة",
        "علاوة على ذلك", "بالإضافة إلى ذلك", "في عالم", "في ظل",
        "ما أهمية هذا", "كيف يمكننا", "من ناحية", "من جهة أخرى"
      ],
      simplifyMap: {
        "من المهم أن نلاحظ أن": "نلاحظ أن",
        "في العصر الحديث": "اليوم",
        "في العالم الرقمي": "عبر الإنترنت",
        "بصورة شاملة": "جيداً",
        "على نحو متكامل": "بشكل كامل"
      }
    };
  }

  if (language === 'fr') {
    return {
      deadGiveaway: {
        "en conclusion": ["pour finir", "en bref"],
        "il est important de noter": ["notons que", "il faut savoir"],
        "il convient de souligner": ["soulignons que", "il faut noter"],
        "dans le monde moderne": ["aujourd'hui", "de nos jours"],
        "de plus": ["aussi", "également"],
        "par ailleurs": ["aussi", "en plus"],
        "en outre": ["aussi", "de plus"],
        "crucial": ["important", "clé"],
        "pivotal": ["clé", "central"],
        "essentiel": ["important", "nécessaire"]
      },
      highFrequency: {
        "faciliter": ["aider", "permettre"],
        "favoriser": ["aider", "soutenir"],
        "optimiser": ["améliorer", "renforcer"],
        "par conséquent": ["donc", "ainsi"],
        "en conséquence": ["donc", "ainsi"],
        "conséquent": ["important", "grand"],
        "significatif": ["important", "marqué"],
        "considérable": ["grand", "important"]
      },
      removePhrases: [
        "en conclusion", "pour conclure", "en résumé", "en fin de compte",
        "il est important de noter", "il convient de souligner", "il faut noter",
        "dans le monde moderne", "à l'ère du numérique", "de nos jours",
        "de plus", "par ailleurs", "en outre", "d'une part", "d'autre part"
      ],
      simplifyMap: {
        "il est important de noter que": "notons que",
        "il convient de souligner que": "soulignons que",
        "à l'heure actuelle": "aujourd'hui",
        "de ce fait": "donc",
        "par conséquent": "donc"
      }
    };
  }

  if (language === 'pt') {
    return {
      deadGiveaway: {
        "em conclusão": ["em resumo", "em suma", "para concluir"],
        "é importante notar": ["note-se que", "convém notar"],
        "convém salientar": ["saliente-se", "note-se"],
        "no mundo moderno": ["hoje", "atualmente"],
        "além disso": ["também", "ademais"],
        "por outro lado": ["também", "além disso"],
        "crucial": ["importante", "essencial"],
        "fundamental": ["importante", "básico"],
        "essencial": ["importante", "necessário"]
      },
      highFrequency: {
        "facilitar": ["ajudar", "permitir"],
        "fomentar": ["estimular", "promover"],
        "otimizar": ["melhorar", "aperfeiçoar"],
        "consequentemente": ["portanto", "assim"],
        "por conseguinte": ["portanto", "assim"],
        "significativo": ["importante", "relevante"],
        "considerável": ["grande", "importante"]
      },
      removePhrases: [
        "em conclusão", "para concluir", "em resumo", "em suma",
        "é importante notar", "convém salientar", "importa referir",
        "no mundo moderno", "na era digital", "nos dias de hoje",
        "além disso", "por outro lado", "ademais", "por um lado", "por outro lado"
      ],
      simplifyMap: {
        "é importante notar que": "note-se que",
        "convém salientar que": "saliente-se que",
        "no momento atual": "agora",
        "deste modo": "assim",
        "por conseguinte": "portanto"
      }
    };
  }

  if (language === 'it') {
    return {
      deadGiveaway: {
        "in conclusione": ["in sintesi", "in breve", "per concludere"],
        "è importante notare": ["notiamo che", "va notato"],
        "va sottolineato": ["sottolineiamo", "notiamo"],
        "nel mondo moderno": ["oggi", "al giorno d'oggi"],
        "inoltre": ["anche", "inoltre"],
        "d'altra parte": ["anche", "inoltre"],
        "cruciale": ["importante", "chiave"],
        "fondamentale": ["importante", "essenziale"],
        "essenziale": ["importante", "necessario"]
      },
      highFrequency: {
        "facilitare": ["aiutare", "permettere"],
        "favorire": ["aiutare", "sostenere"],
        "ottimizzare": ["migliorare", "rafforzare"],
        "di conseguenza": ["quindi", "così"],
        "pertanto": ["quindi", "così"],
        "significativo": ["importante", "notevole"],
        "considerevole": ["grande", "importante"]
      },
      removePhrases: [
        "in conclusione", "per concludere", "in sintesi", "in breve",
        "è importante notare", "va sottolineato", "conviene notare",
        "nel mondo moderno", "nell'era digitale", "al giorno d'oggi",
        "inoltre", "d'altra parte", "d'un lato", "d'altro lato"
      ],
      simplifyMap: {
        "è importante notare che": "notiamo che",
        "va sottolineato che": "sottolineiamo che",
        "al momento": "oggi",
        "di conseguenza": "quindi",
        "pertanto": "quindi"
      }
    };
  }
  
  // Default English replacements
  return {
    deadGiveaway: DEAD_GIVEAWAY_REPLACEMENTS_EN,
    highFrequency: HIGH_FREQUENCY_REPLACEMENTS_EN,
    removePhrases: REMOVE_PHRASES_EN,
    simplifyMap: SIMPLIFY_MAP_EN
  };
}

// TIER 1: Dead giveaway words - ALWAYS remove/replace (English)
const DEAD_GIVEAWAY_REPLACEMENTS_EN: { [key: string]: string[] } = {
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

// TIER 2: High-frequency AI words - EXPANDED (English)
const HIGH_FREQUENCY_REPLACEMENTS_EN: { [key: string]: string[] } = {
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

// Phrases to completely remove - EXPANDED LIST (English)
const REMOVE_PHRASES_EN = [
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

// Simplification patterns - EXPANDED (English)
const SIMPLIFY_MAP_EN: { [key: string]: string } = {
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
  private language: 'en' | 'he' | 'ar' | 'fr' | 'pt' | 'it' = 'en';
  private replacements: ReturnType<typeof getReplacements>;
  /** Hebrew and Arabic don't use \b for word boundaries; use space/start/end instead */
  private get useWordBoundaries(): boolean {
    return this.language === 'en' || this.language === 'fr' || this.language === 'pt' || this.language === 'it';
  }
  
  constructor(language: 'en' | 'he' | 'ar' | 'fr' | 'pt' | 'it' = 'en') {
    this.language = language;
    this.replacements = getReplacements(language);
  }
  
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
        
        // Try multiple patterns for better matching - Hebrew/Arabic need different boundaries (\b doesn't work)
        const patterns = !this.useWordBoundaries
          ? [
              new RegExp(`(^|\\s)${escaped}[,;:.]?\\s*`, 'g'),
              new RegExp(`^\\s*${escaped}[,;:.]?\\s*`, 'gm'),
              new RegExp(`\\s+${escaped}[,;:.]?\\s*([.!?]|$)`, 'g'),
              new RegExp(`\\s+${escaped}\\s+`, 'g'),
              new RegExp(`${escaped}`, 'g')
            ]
          : [
              new RegExp(`\\b${escaped}\\b[,;:.]?\\s*`, 'gi'),
              new RegExp(`^\\s*${escaped}[,;:.]?\\s*`, 'gim'),
              new RegExp(`\\s+${escaped}[,;:.]?\\s*([.!?]|$)`, 'gi'),
              new RegExp(`\\s+${escaped}\\s+`, 'gi'),
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
    const sortedSimplify = Object.entries(this.replacements.simplifyMap).sort((a, b) => b[0].length - a[0].length);
    for (const [verbose, simple] of sortedSimplify) {
      const escaped = verbose.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      result = result.replace(regex, simple);
    }
    
    // SECOND: Remove phrases completely (longer phrases first)
    const sortedRemove = [...this.replacements.removePhrases].sort((a, b) => b.length - a.length);
    for (const phrase of sortedRemove) {
      const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const patterns = !this.useWordBoundaries
        ? [
            new RegExp(`(^|\\s)${escapedPhrase}[,;]?\\s*`, 'g'),
            new RegExp(`\\s+${escapedPhrase}(?=[\\s.,;:!?]|$)`, 'g'),
            new RegExp(`${escapedPhrase}`, 'g')
          ]
        : [
            new RegExp(`\\b${escapedPhrase}\\b[,;]?\\s*`, 'gi'),
            new RegExp(`${escapedPhrase}[,;]?\\s*`, 'gi'),
            new RegExp(`\\b${escapedPhrase}\\b`, 'gi')
          ];
      
      for (const regex of patterns) {
        result = result.replace(regex, '');
      }
    }
    
    // THIRD: Replace dead giveaways with variation (MULTIPLE PASSES for thoroughness)
    // For Hebrew/Arabic, \b doesn't work; use space/punctuation boundaries
    const makeWordRegex = (word: string) => {
      const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return !this.useWordBoundaries ? new RegExp(`(^|\\s)(${esc})(?=\\s|[.,;:!?]|$)`, 'g') : new RegExp(`\\b${esc}\\b`, 'gi');
    };
    for (let pass = 0; pass < 2; pass++) {
      for (const [ai, replacements] of Object.entries(this.replacements.deadGiveaway)) {
        const regex = makeWordRegex(ai);
        result = result.replace(regex, (match, g1?: string, g2?: string) => {
          const repl = this.getRandomReplacement(replacements);
          return !this.useWordBoundaries && g1 ? g1 + repl : repl;
        });
      }
    }
    
    // FOURTH: Replace high-frequency words with variation (MULTIPLE PASSES)
    for (let pass = 0; pass < 2; pass++) {
      for (const [ai, replacements] of Object.entries(this.replacements.highFrequency)) {
        const regex = makeWordRegex(ai);
        result = result.replace(regex, (match, g1?: string, g2?: string) => {
          const repl = this.getRandomReplacement(replacements);
          return !this.useWordBoundaries && g1 ? g1 + repl : repl;
        });
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
    
    if (this.language === 'en') {
      for (const [phrase, replacements] of Object.entries(phrasePatterns)) {
        const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        result = result.replace(regex, () => this.getRandomReplacement(replacements));
      }
    }
    
    return result;
  }
  
  // Step 2: Break long sentences - language-aware
  breakSentences(text: string): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const result: string[] = [];
    
    const breakPatterns = this.language === 'he'
      ? [
          { pattern: /, (ו|אבל|כי|או|אוֹ|אז|כך|לכן|אם) /, minWords: 3 },
          { pattern: / (ו|אבל|כי|או|אז) /, minWords: 4 },
          { pattern: /, /, minWords: 4 },
          { pattern: / (אשר|ש|כאשר|כש) /, minWords: 4 }
        ]
      : this.language === 'fr'
      ? [
          { pattern: /, (et|mais|donc|ou|car|que|qui|car) /, minWords: 3 },
          { pattern: / (et|mais|donc|ou) /, minWords: 4 },
          { pattern: /, /, minWords: 4 },
          { pattern: / (que|qui|dont|parce que) /, minWords: 4 }
        ]
      : this.language === 'pt'
      ? [
          { pattern: /, (e|mas|ou|que|porque|por que) /, minWords: 3 },
          { pattern: / (e|mas|ou|que) /, minWords: 4 },
          { pattern: /, /, minWords: 4 },
          { pattern: / (que|quando|onde|porque) /, minWords: 4 }
        ]
      : this.language === 'it'
      ? [
          { pattern: /, (e|ma|o|che|perché|perchè) /, minWords: 3 },
          { pattern: / (e|ma|o|che) /, minWords: 4 },
          { pattern: /, /, minWords: 4 },
          { pattern: / (che|quando|dove|perché) /, minWords: 4 }
        ]
      : [
          { pattern: /, (and|but|so|because|which|that|when|where) /, minWords: 3 },
          { pattern: / (and|but|so|or) /, minWords: 4 },
          { pattern: /, /, minWords: 4 },
          { pattern: / (that|which|who) /, minWords: 4 },
          { pattern: / (because|since|while|when) /, minWords: 4 }
        ];
    
    for (let sent of sentences) {
      sent = sent.trim();
      if (!sent) continue;
      
      const words = sent.split(/\s+/);
      const wordCount = words.length;
      const charCount = sent.length;
      
      // Break sentences 8+ words OR 60+ characters (more aggressive)
      if (wordCount >= 8 || charCount >= 60) {
        let broken = false;
        
        for (const bp of breakPatterns) {
          const regex = new RegExp(bp.pattern, (this.language === 'he' || this.language === 'ar') ? 'g' : 'i');
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
                const connectors = this.language === 'he'
                  ? ["פשוט.", "ברור?", "מעולה.", "בסדר.", "זהו."]
                  : this.language === 'fr'
                  ? ["Voilà.", "Simple.", "Clair?", "D'accord.", "Logique."]
                  : this.language === 'ar'
                  ? ["بسيط.", "واضح؟", "تمام."]
                  : this.language === 'pt'
                  ? ["Simples.", "Certo?", "Pronto.", "Então.", "Assim."]
                  : this.language === 'it'
                  ? ["Semplice.", "Chiaro?", "Ecco.", "Va bene.", "Logico."]
                  : ["Simple.", "Got it?", "See?", "Makes sense.", "Here's why.", "Clear?", "Right?", "You know?", "Think about it.", "Here's the thing."];
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
  
  // Step 3: Vary vocabulary aggressively (English/French only - Hebrew/Arabic/PT/IT use different structure or no list)
  varyVocabulary(text: string): string {
    if (this.language === 'he' || this.language === 'ar' || this.language === 'pt' || this.language === 'it') return text;
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
  
  // Step 4: Add contractions (English/French only - Hebrew/Arabic/PT/IT use different or no contraction list)
  addContractions(text: string): string {
    if (this.language === 'he' || this.language === 'ar' || this.language === 'pt' || this.language === 'it') return text;
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
  
  // Step 5: Add natural fillers - language-aware
  addFillers(text: string): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const result: string[] = [];
    
    const { fillers, shortInserts } = this.language === 'he'
      ? {
          fillers: ["אז ", "טוב, ", "בעצם, ", "למעשה, ", "בקיצור, ", "אוקיי, ", "פשוט, ", "בכל מקרה, "],
          shortInserts: ["פשוט.", "ברור?", "מעולה.", "בסדר.", "זהו.", "קל.", "ברור.", "בסדר גמור."]
        }
      : this.language === 'fr'
      ? {
          fillers: ["En fait, ", "Bon, ", "Alors, ", "Écoutez, ", "En bref, ", "En tout cas, ", "Vous voyez, ", "D'accord, "],
          shortInserts: ["Simple.", "Clair?", "Voilà.", "C'est tout.", "Pas compliqué.", "Logique.", "D'accord.", "Très bien."]
        }
      : this.language === 'ar'
      ? {
          fillers: ["حسناً، ", "في الواقع، ", "باختصار، ", "على أي حال، ", "كما ترى، ", "طيب، "],
          shortInserts: ["بسيط.", "واضح؟", "تمام.", "لا تعقيد.", "منطقي."]
        }
      : this.language === 'pt'
      ? {
          fillers: ["Bem, ", "Então, ", "Na verdade, ", "Em resumo, ", "De qualquer forma, ", "Olhe, ", "Certo, ", "Ok, "],
          shortInserts: ["Simples.", "Certo?", "Pronto.", "É isso.", "Faz sentido.", "Tranquilo.", "Então.", "Perfeito."]
        }
      : this.language === 'it'
      ? {
          fillers: ["Allora, ", "In realtà, ", "In breve, ", "Comunque, ", "Vedete, ", "Va bene, ", "Ok, ", "Dunque, "],
          shortInserts: ["Semplice.", "Chiaro?", "Ecco.", "Tutto qui.", "Ha senso.", "Va bene.", "Logico.", "Perfetto."]
        }
      : {
          fillers: [
            "Well, ", "Now, ", "So, ", "Look, ", "Actually, ", "Honestly, ",
            "See, ", "Here's the thing, ", "Thing is, ", "Real talk, ",
            "I mean, ", "You know, ", "Right, ", "Okay, "
          ],
          shortInserts: [
            "Simple.", "Got it?", "Clear?", "See?", "Makes sense.",
            "That's it.", "Easy.", "No big deal.", "Pretty straightforward.",
            "Not complicated.", "Works for me.", "Fair enough."
          ]
        };
    
    sentences.forEach((sent, idx) => {
      let processed = sent;
      const wordCount = sent.split(/\s+/).length;
      const charCount = sent.length;
      
      // Add filler (20% chance for medium sentences, 30% for long)
      const fillerChance = wordCount > 15 ? 0.3 : (wordCount > 8 ? 0.2 : 0.1);
      if (Math.random() < fillerChance) {
        const filler = fillers[Math.floor(Math.random() * fillers.length)];
        processed = (this.language === 'he' || this.language === 'ar' || this.language === 'pt' || this.language === 'it') ? filler + sent : filler + sent.charAt(0).toLowerCase() + sent.slice(1);
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
  
  // Run one pass of humanization on a single block (no internal paragraph splits)
  private humanizeBlock(block: string, detectedPhrases: string[] = []): string {
    let result = block;
    result = this.removeEmojis(result);
    result = this.fixDashes(result);
    result = this.removeLeadingSpaces(result);
    result = this.breakUniformParagraphs(result);
    result = this.replaceAIWords(result, detectedPhrases);
    result = this.breakSentences(result);
    result = this.varyVocabulary(result);
    result = this.addContractions(result);
    result = this.addFillers(result);
    result = this.cleanup(result);
    return result;
  }

  // Single humanization pass – preserves paragraph structure (double newlines)
  humanizePass(text: string, detectedPhrases: string[] = []): string {
    this.passCount++;
    console.log(`🔄 Pass ${this.passCount}: Starting humanization (preserving paragraphs)...`);

    // Split by paragraph breaks so we don't turn them into space
    const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 0);

    if (paragraphs.length <= 1) {
      return this.humanizeBlock(text, this.passCount === 1 ? detectedPhrases : []);
    }

    const useDetected = this.passCount === 1 ? detectedPhrases : [];
    const humanized = paragraphs.map((para) => this.humanizeBlock(para, useDetected));
    const result = humanized.join("\n\n");

    console.log(`✓ Pass ${this.passCount} complete (${paragraphs.length} paragraphs preserved)`);
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

/** Sentence-ending characters per language for paragraph splitting in formatting layer */
const SENTENCE_END_BY_LANG: Record<string, string> = {
  en: ".!?",
  fr: ".!?",
  pt: ".!?",
  it: ".!?",
  he: ".!?\u05C3",   // Latin + Hebrew sof pasuq (׃)
  ar: ".!?\u061F\u06D4", // Latin + Arabic question mark (؟) + Arabic full stop (۔)
};

/**
 * Formatting layer: clean spacing and line breaks after humanization.
 * Works for English, French, Hebrew, and Arabic.
 * - Preserves existing paragraph breaks (from humanizePass).
 * - Normalizes line endings and collapses excessive newlines (max one blank line between paragraphs).
 * - Trims each line and the whole text; collapses multiple spaces to single space within each line.
 * - If text has no paragraph breaks and is long, inserts breaks every ~4–5 sentences (using language-appropriate sentence endings).
 * Safe for both plain text and HTML (preserves tag structure).
 */
function applyFormattingLayer(text: string, language: string = "en"): string {
  if (!text || !text.trim()) return text;
  // Normalize line endings to \n
  let s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Collapse 3+ newlines to exactly 2 (one blank line between paragraphs)
  s = s.replace(/\n{3,}/g, "\n\n");
  const lines = s.split("\n");
  const result: string[] = [];
  let prevEmpty = false;
  for (const line of lines) {
    const trimmed = line.trim();
    const collapsed = trimmed.replace(/\s+/g, " ");
    const isEmpty = collapsed.length === 0;
    if (isEmpty && prevEmpty) continue;
    prevEmpty = isEmpty;
    result.push(collapsed);
  }
  let out = result.join("\n").trim();

  // If still one long line (no paragraph breaks) and long enough, add paragraph breaks every few sentences
  const minLengthForBreak = language === "ar" || language === "he" ? 300 : 400;
  if (!out.includes("\n\n") && out.length > minLengthForBreak) {
    const endChars = SENTENCE_END_BY_LANG[language] || SENTENCE_END_BY_LANG.en;
    const escaped = endChars.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const sentenceRegex = new RegExp(`(?<=[${escaped}])\\s+`, "gu");
    const sentences = out.split(sentenceRegex).filter((x) => x.trim());
    const maxSentencesPerParagraph = 4;
    const paragraphs: string[] = [];
    for (let i = 0; i < sentences.length; i += maxSentencesPerParagraph) {
      paragraphs.push(sentences.slice(i, i + maxSentencesPerParagraph).join(" ").trim());
    }
    out = paragraphs.filter((p) => p.length > 0).join("\n\n");
  }

  return out;
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
    const { text, passes = 5, detectedPhrases = [], language } = body; // Accept passes, detectedPhrases, and language parameters
    
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid text input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Determine language preference (from body or cookie)
    const preferredLanguage = language || req.headers.get('cookie')?.split('; ').find(row => row.startsWith('preferred-language='))?.split('=')[1] || 'en';
    const validLanguage = (preferredLanguage === 'he' || preferredLanguage === 'en' || preferredLanguage === 'ar' || preferredLanguage === 'fr' || preferredLanguage === 'pt' || preferredLanguage === 'it') ? preferredLanguage : 'en';
    
    // Validate passes parameter
    const numPasses = Math.min(Math.max(1, parseInt(passes) || 5), 5); // 1-5 passes max, default 5
    
    // Validate detectedPhrases - ensure it's an array of strings
    const validDetectedPhrases = Array.isArray(detectedPhrases) 
      ? detectedPhrases.filter(p => typeof p === 'string' && p.trim().length > 0)
      : [];
    
    console.log(`🔥 Processing ${text.length} characters with ${numPasses} passes, language: ${validLanguage}...`);
    if (validDetectedPhrases.length > 0) {
      console.log(`📋 Targeting ${validDetectedPhrases.length} detected AI phrases for removal`);
    }
    
    // Check if HTML is present
    const hasHTML = /<[^>]+>/.test(text);
    if (hasHTML) {
      console.log(`🧩 HTML detected in content, preserving tag structure during humanization`);
    }
    
    const humanizer = new MultiPassHumanizer(validLanguage as 'en' | 'he' | 'ar' | 'fr' | 'pt' | 'it');
    const humanized = processHTML(text, humanizer, numPasses, validDetectedPhrases);
    const formatted = applyFormattingLayer(humanized, validLanguage);
    
    const ratio = text.length > 0 ? (formatted.length / text.length) : 1;
    
    console.log(`✅ Humanization complete (${formatted.length} chars, was ${text.length} chars, ratio: ${(ratio * 100).toFixed(1)}%)`);
    
    return new Response(
      JSON.stringify({
        humanVersion: formatted,
        original: text,
        success: true,
        passes: numPasses,
        detectedPhrasesRemoved: validDetectedPhrases.length,
        length: {
          original: text.length,
          humanized: formatted.length,
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

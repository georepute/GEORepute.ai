#!/usr/bin/env tsx
/**
 * LLM API Keys Test Script
 * 
 * Tests all configured LLM API keys to verify they are working correctly.
 * 
 * Usage:
 *   npm run test:llm-keys
 * 
 * Or directly:
 *   npx tsx scripts/test-llm-keys.ts
 * 
 * Or with ts-node:
 *   ts-node scripts/test-llm-keys.ts
 * 
 * Make sure your .env.local file has the API keys configured:
 *   OPENAI_API_KEY=sk-...
 *   ANTHROPIC_API_KEY=sk-ant-...
 *   GOOGLE_API_KEY=...
 *   PERPLEXITY_API_KEY=pplx-...
 *   GROQ_API_KEY=gsk_...
 */

import OpenAI from "openai";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables from .env.local
function loadEnvFile() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const envFile = readFileSync(envPath, "utf-8");
    const envVars: Record<string, string> = {};
    
    envFile.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").replace(/^["']|["']$/g, "");
          envVars[key.trim()] = value.trim();
        }
      }
    });
    
    // Set environment variables
    Object.entries(envVars).forEach(([key, value]) => {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    // .env.local might not exist, that's okay
    console.log("Note: .env.local file not found, using existing environment variables\n");
  }
}

loadEnvFile();

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

interface TestResult {
  platform: string;
  status: "success" | "error" | "missing";
  message: string;
  responseTime?: number;
  error?: string;
}

// Test OpenAI (ChatGPT)
async function testOpenAI(): Promise<TestResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      platform: "OpenAI (ChatGPT)",
      status: "missing",
      message: "API key not found in environment variables",
    };
  }

  const startTime = Date.now();
  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: "Say 'API test successful' if you can read this." },
      ],
      max_tokens: 20,
    });

    const responseTime = Date.now() - startTime;
    const content = response.choices[0]?.message?.content || "";

    return {
      platform: "OpenAI (ChatGPT)",
      status: "success",
      message: `API key is valid. Response: ${content.substring(0, 50)}`,
      responseTime,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      platform: "OpenAI (ChatGPT)",
      status: "error",
      message: "API key test failed",
      responseTime,
      error: error.message || "Unknown error",
    };
  }
}

// Test Anthropic (Claude)
async function testAnthropic(): Promise<TestResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return {
      platform: "Anthropic (Claude)",
      status: "missing",
      message: "API key not found in environment variables",
    };
  }

  const startTime = Date.now();
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 20,
        system: "You are a helpful assistant.",
        messages: [
          {
            role: "user",
            content: "Say 'API test successful' if you can read this.",
          },
        ],
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.text();
      return {
        platform: "Anthropic (Claude)",
        status: "error",
        message: `API request failed with status ${response.status}`,
        responseTime,
        error: errorData.substring(0, 200),
      };
    }

    const data = await response.json();
    const content = data.content && data.content[0] ? data.content[0].text : "";

    return {
      platform: "Anthropic (Claude)",
      status: "success",
      message: `API key is valid. Response: ${content.substring(0, 50)}`,
      responseTime,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      platform: "Anthropic (Claude)",
      status: "error",
      message: "API key test failed",
      responseTime,
      error: error.message || "Unknown error",
    };
  }
}

// Test Google (Gemini)
async function testGoogle(): Promise<TestResult> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      platform: "Google (Gemini)",
      status: "missing",
      message: "API key not found in environment variables",
    };
  }

  const startTime = Date.now();
  try {
    // Try gemini-2.0-flash first (v1 API, matches codebase usage)
    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "Say 'API test successful' if you can read this.",
                },
              ],
            },
          ],
        }),
      }
    );

    // If gemini-2.0-flash fails, try gemini-1.5-flash as fallback
    if (!response.ok && response.status === 404) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: "Say 'API test successful' if you can read this.",
                  },
                ],
              },
            ],
          }),
        }
      );
    }

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.text();
      return {
        platform: "Google (Gemini)",
        status: "error",
        message: `API request failed with status ${response.status}`,
        responseTime,
        error: errorData.substring(0, 200),
      };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return {
      platform: "Google (Gemini)",
      status: "success",
      message: `API key is valid. Response: ${content.substring(0, 50)}`,
      responseTime,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      platform: "Google (Gemini)",
      status: "error",
      message: "API key test failed",
      responseTime,
      error: error.message || "Unknown error",
    };
  }
}

// Test Perplexity
async function testPerplexity(): Promise<TestResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return {
      platform: "Perplexity",
      status: "missing",
      message: "API key not found in environment variables",
    };
  }

  const startTime = Date.now();
  try {
    // Try 'sonar' first (matches codebase usage)
    let response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant.",
          },
          {
            role: "user",
            content: "Say 'API test successful' if you can read this.",
          },
        ],
        max_tokens: 20,
        temperature: 0.7,
      }),
    });

    // If sonar fails, try sonar-small-online as fallback
    if (!response.ok && response.status === 404) {
      response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar-small-online",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant.",
            },
            {
              role: "user",
              content: "Say 'API test successful' if you can read this.",
            },
          ],
          max_tokens: 20,
          temperature: 0.7,
        }),
      });
    }

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.text();
      return {
        platform: "Perplexity",
        status: "error",
        message: `API request failed with status ${response.status}`,
        responseTime,
        error: errorData.substring(0, 200),
      };
    }

    const data = await response.json();
    const content = data.choices && data.choices[0] && data.choices[0].message 
      ? data.choices[0].message.content 
      : "";

    return {
      platform: "Perplexity",
      status: "success",
      message: `API key is valid. Response: ${content.substring(0, 50)}`,
      responseTime,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      platform: "Perplexity",
      status: "error",
      message: "API key test failed",
      responseTime,
      error: error.message || "Unknown error",
    };
  }
}

// Test Groq
async function testGroq(): Promise<TestResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      platform: "Groq",
      status: "missing",
      message: "API key not found in environment variables",
    };
  }

  const startTime = Date.now();
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant.",
          },
          {
            role: "user",
            content: "Say 'API test successful' if you can read this.",
          },
        ],
        max_tokens: 20,
        temperature: 0.7,
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.text();
      return {
        platform: "Groq",
        status: "error",
        message: `API request failed with status ${response.status}`,
        responseTime,
        error: errorData.substring(0, 200),
      };
    }

    const data = await response.json();
    const content = data.choices && data.choices[0] && data.choices[0].message 
      ? data.choices[0].message.content 
      : "";

    return {
      platform: "Groq",
      status: "success",
      message: `API key is valid. Response: ${content.substring(0, 50)}`,
      responseTime,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      platform: "Groq",
      status: "error",
      message: "API key test failed",
      responseTime,
      error: error.message || "Unknown error",
    };
  }
}

// Print test result
function printResult(result: TestResult) {
  const { platform, status, message, responseTime, error } = result;

  let statusIcon = "";
  let statusColor = "";

  if (status === "success") {
    statusIcon = "✅";
    statusColor = colors.green;
  } else if (status === "error") {
    statusIcon = "❌";
    statusColor = colors.red;
  } else {
    statusIcon = "⚠️";
    statusColor = colors.yellow;
  }

  console.log(`${statusIcon} ${statusColor}${colors.bold}${platform}${colors.reset}`);
  console.log(`   ${message}`);
  if (responseTime !== undefined) {
    console.log(`   Response time: ${responseTime}ms`);
  }
  if (error) {
    console.log(`   ${colors.red}Error: ${error}${colors.reset}`);
  }
  console.log();
}

// Main function
async function main() {
  console.log(`${colors.cyan}${colors.bold}LLM API Keys Test${colors.reset}\n`);
  console.log("Testing all configured LLM API keys...\n");

  const results: TestResult[] = [];

  // Run all tests
  results.push(await testOpenAI());
  results.push(await testAnthropic());
  results.push(await testGoogle());
  results.push(await testPerplexity());
  results.push(await testGroq());

  // Print all results
  results.forEach(printResult);

  // Summary
  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;
  const missingCount = results.filter((r) => r.status === "missing").length;

  console.log(`${colors.bold}Summary:${colors.reset}`);
  console.log(`  ${colors.green}✅ Working: ${successCount}${colors.reset}`);
  console.log(`  ${colors.red}❌ Errors: ${errorCount}${colors.reset}`);
  console.log(`  ${colors.yellow}⚠️  Missing: ${missingCount}${colors.reset}`);
  console.log();

  // Exit with appropriate code
  if (errorCount > 0) {
    process.exit(1);
  } else if (successCount === 0) {
    console.log(`${colors.yellow}⚠️  No API keys were tested. Make sure your .env.local file has the API keys configured.${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✅ All configured API keys are working!${colors.reset}`);
    process.exit(0);
  }
}

// Run the script
main().catch((error) => {
  console.error(`${colors.red}${colors.bold}Fatal error:${colors.reset}`, error);
  process.exit(1);
});

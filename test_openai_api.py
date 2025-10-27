#!/usr/bin/env python3
"""
OpenAI API Key Test Script
Tests if your OpenAI API key is working correctly
"""

import os
import sys
from openai import OpenAI

def test_openai_api():
    """Test OpenAI API key functionality"""
    
    print("🔑 Testing OpenAI API Key...")
    print("=" * 50)
    
    # Get API key from environment variable
    api_key = os.getenv('OPENAI_API_KEY')
    
    if not api_key:
        print("❌ Error: OPENAI_API_KEY environment variable not found!")
        print("\nTo set your API key:")
        print("1. Export it: export OPENAI_API_KEY='your-key-here'")
        print("2. Or add to .env file: OPENAI_API_KEY=your-key-here")
        print("3. Or pass directly: python test_openai_api.py your-key-here")
        
        # Check if API key was passed as command line argument
        if len(sys.argv) > 1:
            api_key = sys.argv[1]
            print(f"\n🔑 Using API key from command line argument")
        else:
            return False
    else:
        print(f"✅ Found API key: {api_key[:8]}...{api_key[-4:]}")
    
    try:
        # Initialize OpenAI client
        print("\n🤖 Initializing OpenAI client...")
        client = OpenAI(api_key=api_key)
        
        # Test 1: Simple completion
        print("\n📝 Test 1: Simple text completion...")
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "user", "content": "Say 'Hello, OpenAI API is working!' in exactly those words."}
            ],
            max_tokens=50,
            temperature=0.1
        )
        
        completion_text = response.choices[0].message.content
        print(f"✅ Response: {completion_text}")
        
        # Test 2: Check available models
        print("\n🔍 Test 2: Checking available models...")
        models = client.models.list()
        model_names = [model.id for model in models.data]
        
        print(f"✅ Found {len(model_names)} available models")
        print("📋 Available models:")
        for model in sorted(model_names)[:10]:  # Show first 10 models
            print(f"   - {model}")
        if len(model_names) > 10:
            print(f"   ... and {len(model_names) - 10} more")
        
        # Test 3: Test with different model (if available)
        print("\n🚀 Test 3: Testing with GPT-4 (if available)...")
        if "gpt-4" in model_names:
            try:
                response = client.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {"role": "user", "content": "What is 2+2? Answer in one word."}
                    ],
                    max_tokens=10,
                    temperature=0
                )
                gpt4_response = response.choices[0].message.content
                print(f"✅ GPT-4 Response: {gpt4_response}")
            except Exception as e:
                print(f"⚠️  GPT-4 test failed: {e}")
        else:
            print("ℹ️  GPT-4 not available with this API key")
        
        # Test 4: Check usage/limits
        print("\n📊 Test 4: Checking API usage...")
        try:
            # Note: This might not work with all API keys
            usage = client.usage.retrieve()
            print(f"✅ API usage retrieved successfully")
        except Exception as e:
            print(f"ℹ️  Usage info not available: {e}")
        
        print("\n" + "=" * 50)
        print("🎉 SUCCESS! Your OpenAI API key is working correctly!")
        print("✅ You can now integrate OpenAI into your GeoRepute.ai project")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error testing OpenAI API: {e}")
        print("\n🔧 Troubleshooting:")
        print("1. Check if your API key is correct")
        print("2. Verify you have credits in your OpenAI account")
        print("3. Check if your API key has the right permissions")
        print("4. Make sure you have an active OpenAI account")
        
        return False

def main():
    """Main function"""
    print("🧪 OpenAI API Key Test Script")
    print("Testing your OpenAI API key for GeoRepute.ai integration")
    print()
    
    success = test_openai_api()
    
    if success:
        print("\n🚀 Next Steps:")
        print("1. Install OpenAI in your Next.js project: npm install openai")
        print("2. Add OPENAI_API_KEY to your .env.local file")
        print("3. Start building AI content generation features!")
        sys.exit(0)
    else:
        print("\n💡 Need Help?")
        print("1. Get API key: https://platform.openai.com/api-keys")
        print("2. Check billing: https://platform.openai.com/account/billing")
        print("3. View docs: https://platform.openai.com/docs")
        sys.exit(1)

if __name__ == "__main__":
    main()

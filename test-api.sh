#!/bin/bash

echo "🧪 Testing Extractly API Endpoints"
echo "================================="

# Test health endpoint
echo "1. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
echo " Health: $HEALTH_RESPONSE"
echo ""

# Test records endpoint
echo "2. Testing records endpoint..."
RECORDS_RESPONSE=$(curl -s http://localhost:3000/api/records)
echo " Records: $RECORDS_RESPONSE"
echo ""

# Test ingest endpoint with sample data (will fail without Gemini API key)
echo "3. Testing ingest endpoint..."
INGEST_RESPONSE=$(curl -s -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "html": "<html><head><title>Test Page</title></head><body><h1>Welcome</h1><p>Price: $19.99</p></body></html>",
    "instruction": "Get the title and price"
  }')

if echo "$INGEST_RESPONSE" | grep -q "record_id"; then
    echo " Ingest: Success - Data extracted!"
    echo "$INGEST_RESPONSE" | jq '.'
elif echo "$INGEST_RESPONSE" | grep -q "GEMINI_API_KEY"; then
    echo " Ingest: Needs Gemini API key to be configured"
    echo "   Please add your GEMINI_API_KEY to backend/.env"
else
    echo " Ingest: Error occurred"
    echo "$INGEST_RESPONSE"
fi

echo ""
echo "API testing complete!"
echo ""
echo "Next steps:"
echo "1. Add your GEMINI_API_KEY to backend/.env"
echo "2. Load the Chrome extension from /extension folder"
echo "3. Test on real websites!"

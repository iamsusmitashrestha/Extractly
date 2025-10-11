# Extractly Setup Guide

### **Backend (Node.js + Express + TypeScript + Prisma)**
- RESTful API with `/api/ingest` endpoint
- PostgreSQL database with Prisma ORM
- Gemini AI integration for natural language processing
- Type-safe database operations
- Error handling and validation
- Rate limiting and security middleware
- Request logging and health checks

### **Chrome Extension (Manifest v3)**
- Beautiful popup UI with chat-style interface
- HTML content extraction from active tabs
- Background service worker
- Content scripts for page interaction
- Proper permissions and security

### **Database (PostgreSQL + Docker)**
- Docker container setup
- Prisma schema with migrations
- Extraction records storage
- JSON support for flexible data

## **Next Steps to Get Started**

### 1. **Get Your Gemini API Key**
```bash
# Visit: https://makersuite.google.com/app/apikey
# Create a new API key
# Copy the key for the next step
```

### 2. **Configure Environment**
```bash
# Edit the backend/.env file
cd backend
nano .env

# Add your Gemini API key:
GEMINI_API_KEY="your_actual_gemini_api_key_here"
```

### 3. **Verify Backend is Running**
```bash
# The backend should already be running from our setup
# If not, start it:
cd backend
npm run dev

# Test the health endpoint:
curl http://localhost:3000/health
```

### 4. **Load Chrome Extension**
1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `/extension` folder from your project
6. The Extractly extension should appear in your extensions list

### 5. **Test the Extension**
1. Navigate to any website (try Amazon, news sites, etc.)
2. Click the Extractly extension icon in your toolbar
3. Enter a natural language instruction like:
   - "Get the title, price, and rating"
   - "Extract the headline, author, and publish date"
   - "Find all contact information"
4. Click "Extract Data"
5. View the structured results!

## **Available Commands**

### Backend Commands
```bash
cd backend

# Development server with hot reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Database management
npm run db:studio    # Open Prisma Studio (database GUI)
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:reset     # Reset database (dev only)
```

### Database Commands
```bash
# Start database
docker-compose up -d

# Stop database
docker-compose down

# View database logs
docker-compose logs postgres

# Check database status
docker-compose ps
```

## **Testing Examples**

### E-commerce Sites (Amazon, eBay, etc.)
```
Instruction: "Get the product title, price, rating, and description"
Expected: Extracts product information with confidence scores
```

### News Articles
```
Instruction: "Extract the headline, author, publish date, and summary"
Expected: Extracts article metadata and content
```

### Contact Pages
```
Instruction: "Find the email address, phone number, and physical address"
Expected: Extracts contact information
```

### Social Media Posts
```
Instruction: "Get the post text, author name, and engagement metrics"
Expected: Extracts social media data
```

## **API Endpoints**

### POST `/api/ingest`
Extract data from HTML using natural language.

**Request:**
```json
{
  "url": "https://example.com",
  "html": "<html>...</html>",
  "instruction": "Get the title and price"
}
```

**Response:**
```json
{
  "url": "https://example.com",
  "instruction": "Get the title and price",
  "parsed_fields": ["title", "price"],
  "extracted": {
    "title": "Product Name",
    "price": "$29.99"
  },
  "confidence": {
    "title": 0.95,
    "price": 0.92
  },
  "record_id": "uuid-here"
}
```

### GET `/api/records`
Get all extraction records with pagination.

### GET `/api/records/:id`
Get specific extraction record by ID.

### GET `/health`
Health check endpoint.

## **Database Inspection**

View your extraction data in real-time:
```bash
cd backend
npm run db:studio
```
This opens Prisma Studio at `http://localhost:5555`

## **Troubleshooting**

### Backend Won't Start
```bash
# Check if PostgreSQL is running
docker-compose ps

# Check environment variables
cat backend/.env

# Reinstall dependencies
cd backend && npm install
```

### Extension Not Working
```bash
# Check if backend is running
curl http://localhost:3000/health

# Check Chrome extension console
# Right-click extension popup → Inspect → Console tab
```

### Database Issues
```bash
# Reset database (development only)
cd backend
npm run db:reset

# Check database connection
npx prisma db pull
```

### Gemini API Issues
```bash
# Verify API key is set
echo $GEMINI_API_KEY

# Check API quota at Google AI Studio
# Ensure billing is enabled if required
```

## **Success Indicators**

You'll know everything is working when:

1. Backend health check returns `{"status":"ok"}`
2. Extension loads without errors in Chrome
3. Extension popup shows current page URL
4. Test extraction returns structured data
5. Data appears in Prisma Studio
6. Confidence scores are reasonable (>0.7 for good extractions)

## **Development Workflow**

1. **Make Backend Changes**: Edit files in `/backend/src/`
2. **Auto-Reload**: Server restarts automatically with nodemon
3. **Make Extension Changes**: Edit files in `/extension/`
4. **Reload Extension**: Go to `chrome://extensions/` and click refresh
5. **Test Changes**: Use the extension on various websites
6. **View Data**: Check Prisma Studio for stored extractions

## **Next Features to Add**

- **History View**: Show past extractions in extension popup
- **Export Options**: CSV, JSON export of extraction data
- **Custom Templates**: Save common extraction patterns
- **Batch Processing**: Extract from multiple tabs
- **Visual Highlighting**: Show extracted elements on page
- **API Authentication**: Secure the backend API
- **Chrome Web Store**: Publish the extension

**Start extracting data from the web with natural language instructions!**

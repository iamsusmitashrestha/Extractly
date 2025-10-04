# Exractly - Natural Language Web Data Extraction

A powerful Chrome Extension that uses AI to extract structured data from web pages using natural language instructions.

## Features

- **Natural Language Processing**: Describe what data you want in plain English
- **AI-Powered Extraction**: Uses Google Gemini to understand and extract data
- **Structured Results**: Get clean, structured data with confidence scores
- **Database Storage**: All extractions are saved with unique record IDs
- **Modern UI**: Beautiful, responsive popup interface
- **Type-Safe Backend**: Built with TypeScript and Prisma ORM

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Chrome         │    │  Node.js        │    │  PostgreSQL     │
│  Extension      │───▶│  Backend        │───▶│  Database       │
│  (Manifest v3)  │    │  + Gemini AI    │    │  + Prisma ORM   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+ 
- Docker (for PostgreSQL)
- Chrome Browser
- Gemini API Key

### 1. Database Setup

```bash
# Start PostgreSQL with Docker
docker-compose up -d

# Verify database is running
docker-compose ps
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Initialize Prisma and run migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

The backend will be running at `http://localhost:3000`

### 3. Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `/extension` folder from this project
5. The Exractly extension should now appear in your extensions

### 4. Usage

1. Navigate to any webpage
2. Click the Exractly extension icon
3. Enter a natural language instruction (e.g., "Get the title, price, and rating")
4. Click "Extract Data"
5. View the structured results with confidence scores

## Project Structure

```
exractly/
├── backend/                 # Node.js + Express + TypeScript
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # Database migrations
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── controllers/    # API route handlers
│   │   ├── middleware/     # Express middleware
│   │   ├── services/       # Business logic (Gemini + Database)
│   │   └── utils/          # Helper functions
│   ├── .env                # Environment variables
│   ├── package.json
│   └── tsconfig.json
├── extension/              # Chrome Extension (Manifest v3)
│   ├── popup/              # Extension popup UI
│   ├── background/         # Service worker
│   ├── content/            # Content scripts
│   └── manifest.json       # Extension configuration
├── database/
│   └── init.sql           # Database initialization
└── docker-compose.yml     # PostgreSQL container
```

## API Endpoints

### POST `/api/ingest`
Extract data from HTML using natural language instructions.

**Request:**
```json
{
  "url": "https://example.com",
  "html": "<html>...</html>",
  "instruction": "Get the title, price, and rating"
}
```

**Response:**
```json
{
  "url": "https://example.com",
  "instruction": "Get the title, price, and rating",
  "parsed_fields": ["title", "price", "rating"],
  "extracted": {
    "title": "Product Name",
    "price": "$29.99",
    "rating": "4.5/5"
  },
  "confidence": {
    "title": 0.95,
    "price": 0.92,
    "rating": 0.87
  },
  "record_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

### GET `/api/records/:id`
Get extraction record by ID.

### GET `/api/records`
Get all extraction records with pagination.

### GET `/health`
Health check endpoint.

## Development

### Backend Development

```bash
# Start development server with hot reload
npm run dev

# Run Prisma Studio (database GUI)
npm run db:studio

# Reset database (development only)
npm run db:reset

# Generate Prisma client after schema changes
npm run db:generate
```

### Database Management

```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations to production
npx prisma migrate deploy

# View database in browser
npx prisma studio
```

### Extension Development

1. Make changes to extension files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Exractly extension
4. Test your changes

## Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/exractly?schema=public"

# Gemini AI
GEMINI_API_KEY="your_gemini_api_key_here"

# Server
PORT=3000
NODE_ENV=development

# Security
CORS_ORIGIN="chrome-extension://*"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_BODY_SIZE="10mb"
MAX_HTML_SIZE=5242880
```

## Testing

### Manual Testing

1. Start the backend server
2. Load the extension in Chrome
3. Navigate to a test website (e.g., Amazon product page)
4. Use the extension to extract data
5. Verify results in the popup and database

### Example Test Instructions

- **E-commerce**: "Get the product title, price, rating, and description"
- **News Article**: "Extract the headline, author, publish date, and summary"
- **Contact Page**: "Find the email, phone number, and address"
- **Social Media**: "Get the post text, author, and engagement metrics"

## Troubleshooting

### Common Issues

1. **Backend won't start**
   - Check if PostgreSQL is running: `docker-compose ps`
   - Verify environment variables in `.env`
   - Run `npm install` to ensure dependencies are installed

2. **Extension not working**
   - Check if backend is running on `localhost:3000`
   - Verify extension is loaded in Chrome extensions page
   - Check browser console for errors

3. **Database connection issues**
   - Ensure Docker is running
   - Check DATABASE_URL in `.env`
   - Run `npx prisma migrate dev` to apply migrations

4. **Gemini API errors**
   - Verify GEMINI_API_KEY is set correctly
   - Check API quota and billing
   - Ensure API key has proper permissions

### Logs

- **Backend logs**: Check terminal where `npm run dev` is running
- **Extension logs**: Open Chrome DevTools on the extension popup
- **Database logs**: Check Docker logs with `docker-compose logs postgres`

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:
- Check the troubleshooting section above
- Review the logs for error messages
- Create an issue on GitHub with detailed information

---

**Built using Node.js, TypeScript, Prisma, and Google Gemini AI**

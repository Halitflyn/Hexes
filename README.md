# Hex Casting Grimoire & Creator

A web application for creating, visualizing, and sharing spells for the Hex Casting Minecraft mod. This tool allows you to draw hex patterns, generate spells using AI, save them to a local Grimoire, and share them with others via URL.

## Features

- **Interactive Hex Canvas**: Draw your spells directly on a hexagonal grid.
- **AI Spell Generation**: Describe what you want the spell to do, and the AI will generate the correct sequence of hex patterns (requires Gemini API Key).
- **Grimoire Storage**: Save your favorite spells locally in your browser.
- **Spell Sharing**: Generate a unique link to share your spell with anyone.
- **Pattern Templates**: Save specific glyph poses to ensure consistency when generating or adding new patterns.
- **Import/Export**: Backup your entire Grimoire to a JSON file or import existing ones.

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd hex-casting-grimoire
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173` (or the port shown in your terminal).

## AI Generation & API Keys

This application uses the Google Gemini API to generate spells from text descriptions. 

**Important Security Note**: 
- The API key is **never** saved in the source code. 
- If you clone this repository, the AI generation feature will not work out-of-the-box until you provide your own API key.

### How to set up your API Key:

**Option 1: Using the UI (Recommended for users)**
1. Open the app and click the "AI Generation" (magic wand) button.
2. Scroll down to "API Settings".
3. Paste your Gemini API key into the input field. It will be saved securely in your browser's local storage.

**Option 2: Using Environment Variables (For developers)**
1. Create a file named `.env` in the root directory of the project.
2. Add your Gemini API key like this:
   ```env
   VITE_GEMINI_API_KEY="your_api_key_here"
   ```
3. Restart the development server.

You can get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

## Technologies Used

- React
- TypeScript
- Tailwind CSS
- Lucide React (Icons)
- Google Gen AI SDK
- Vite

## License

MIT License

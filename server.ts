import express from "express";
import { createServer as createViteServer } from "vite";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 0. Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // 1. Security Headers (Relaxed for Dev compatibility)
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP temporarily to ensure UI loads
    crossOriginEmbedderPolicy: false,
  }));

  // 2. CORS
  app.use(cors());

  // 3. Body Parsing
  app.use(express.json({ limit: '10mb' })); 

  // 4. Logging Middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // 5. Gemini Proxy API
  app.post("/api/chat", async (req, res) => {
    console.log(`[${new Date().toISOString()}] Chat request received`);
    const { messages, systemInstruction } = req.body;

    if (!messages || !Array.isArray(messages)) {
      console.error("Invalid messages format received:", req.body);
      return res.status(400).json({ error: "Invalid messages format" });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("CRITICAL: GEMINI_API_KEY is missing from environment variables");
        return res.status(500).json({ error: "Server configuration error: API Key missing" });
      }

      console.log("Initializing Gemini SDK...");
      const ai = new GoogleGenAI({ apiKey });
      
      console.log("Calling Gemini API...");
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: messages,
        config: {
          systemInstruction,
          temperature: 1.0,
          topP: 0.95,
          topK: 40,
        },
      });

      if (!response || !response.text) {
        console.error("Gemini returned empty response");
        return res.status(500).json({ error: "Gemini returned an empty response" });
      }

      console.log("Gemini response successful");
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Detailed Gemini Proxy Error:", error);
      res.status(500).json({ 
        error: "Neural link failure", 
        details: error.message || "Unknown error"
      });
    }
  });

  // 6. Vite middleware for development
  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("Starting Vite in middleware mode...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware attached");
    } else {
      console.log("Serving static files from dist...");
      app.use(express.static(path.join(__dirname, "dist")));
      app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "dist", "index.html"));
      });
    }
  } catch (viteError) {
    console.error("Failed to start Vite middleware:", viteError);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[${new Date().toISOString()}] Nylon GPT Secure Server running on port ${PORT}`);
    console.log(`GEMINI_API_KEY status: ${process.env.GEMINI_API_KEY ? "PRESENT" : "MISSING"}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});

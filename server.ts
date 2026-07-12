import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Gemini SDK initialization
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Routes
  app.post("/api/parse-pricelist", async (req, res) => {
    try {
      const { fileData, mimeType, fileName } = req.body;
      
      if (!fileData) {
        return res.status(400).json({ error: "Missing file data" });
      }

      const interaction = await ai.interactions.create({
        model: "gemini-3.5-flash",
        input: [
          { 
            type: "text",
            text: `
              You are a data extraction assistant for a battery and inverter dealer. 
              Extract product information from the provided ${fileName}.
              Focus on: Brand, Series, Model Name, Capacity (Ah for batteries, VA/KVA for inverters), Warranty (months), DP (Dealer Price), and MRP.
              Identify if each item is a 'battery' or an 'inverter'.
              Return the data as a clean JSON array of products.
            ` 
          },
          {
            type: mimeType.includes("pdf") ? "document" : "image",
            data: fileData,
            mime_type: mimeType || "image/jpeg"
          }
        ],
        response_format: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              product_type: { type: Type.STRING },
              brand: { type: Type.STRING },
              series: { type: Type.STRING },
              model_name: { type: Type.STRING },
              capacity: { type: Type.STRING },
              warranty_months: { type: Type.NUMBER },
              dp: { type: Type.NUMBER },
              mrp: { type: Type.NUMBER }
            },
            required: ["product_type", "brand", "model_name", "dp", "mrp"]
          }
        }
      });

      const lastStep = interaction.steps.at(-1);
      let jsonStr = '';
      if (lastStep && lastStep.type === 'model_output') {
        const textContent = lastStep.content?.find(c => c.type === 'text');
        if (textContent) {
          jsonStr = textContent.text.trim();
        }
      }
      
      const extractedData = JSON.parse(jsonStr || "[]");
      res.json(extractedData);
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to parse price list" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

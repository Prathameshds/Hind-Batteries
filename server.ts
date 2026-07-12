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

      console.log(`Parsing file: ${fileName} (${mimeType})`);

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { 
                text: `
                  You are a data extraction assistant for a battery and inverter dealer. 
                  Extract product information from the provided ${fileName}.
                  Focus on: Brand, Series, Model Name, Capacity (Ah for batteries, VA/KVA for inverters), Warranty (months), DP (Dealer Price), and MRP.
                  Identify if each item is a 'battery' or an 'inverter'.
                  Return the data as a clean JSON array of products.
                ` 
              },
              {
                inlineData: {
                  data: fileData,
                  mimeType: mimeType || "image/jpeg"
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
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
        }
      });

      const jsonStr = response.text;
      if (!jsonStr) {
        throw new Error("Empty response from Gemini");
      }

      // Robust JSON extraction
      let extractedData;
      try {
        extractedData = JSON.parse(jsonStr);
      } catch (e) {
        console.warn("Direct JSON parse failed, trying regex extraction");
        const jsonMatch = jsonStr.match(/\[.*\]/s) || jsonStr.match(/\{.*\}/s);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Could not find valid JSON in Gemini response");
        }
      }

      console.log(`Successfully extracted ${extractedData.length} items`);
      res.json(extractedData);
    } catch (error: any) {
      console.error("Gemini Error:", error.message || error);
      res.status(500).json({ error: "Failed to parse price list", details: error.message });
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

import { z } from "zod";
import { GoogleGenAI, Type } from "@google/genai";
import { getServerEnv } from "@/lib/env";
import { extractedReceiptSchema, type ExtractedReceipt } from "@/domain/extraction";

const lineItemSchema = {
  type: Type.OBJECT,
  properties: {
    rawDescription: { type: Type.STRING },
    normalizedName: { type: Type.STRING },
    brand: { type: Type.STRING, nullable: true },
    quantity: { type: Type.NUMBER, nullable: true },
    packageSize: { type: Type.NUMBER, nullable: true },
    unit: {
      type: Type.STRING,
      enum: ["oz", "lb", "g", "kg", "ml", "l", "fl_oz", "count", "unknown"],
    },
    lineTotalCents: { type: Type.INTEGER },
    unitPriceCents: { type: Type.INTEGER, nullable: true },
    discountCents: { type: Type.INTEGER, nullable: true },
    barcode: { type: Type.STRING, nullable: true },
    confidence: {
      type: Type.OBJECT,
      properties: {
        rawDescription: { type: Type.NUMBER },
        normalizedName: { type: Type.NUMBER },
        brand: { type: Type.NUMBER },
        quantity: { type: Type.NUMBER },
        packageSize: { type: Type.NUMBER },
        unit: { type: Type.NUMBER },
        lineTotalCents: { type: Type.NUMBER },
        unitPriceCents: { type: Type.NUMBER },
        barcode: { type: Type.NUMBER },
      },
      required: [
        "rawDescription",
        "normalizedName",
        "brand",
        "quantity",
        "packageSize",
        "unit",
        "lineTotalCents",
        "unitPriceCents",
        "barcode",
      ],
    },
  },
  required: [
    "rawDescription",
    "normalizedName",
    "brand",
    "quantity",
    "packageSize",
    "unit",
    "lineTotalCents",
    "unitPriceCents",
    "discountCents",
    "barcode",
    "confidence",
  ],
};

const receiptSchema = {
  type: Type.OBJECT,
  properties: {
    merchantName: { type: Type.STRING },
    storeAddress: { type: Type.STRING, nullable: true },
    branchClues: { type: Type.STRING, nullable: true },
    phone: { type: Type.STRING, nullable: true },
    purchasedAt: { type: Type.STRING, nullable: true },
    currency: { type: Type.STRING },
    subtotalCents: { type: Type.INTEGER, nullable: true },
    taxCents: { type: Type.INTEGER, nullable: true },
    totalCents: { type: Type.INTEGER },
    items: { type: Type.ARRAY, items: lineItemSchema },
    confidence: {
      type: Type.OBJECT,
      properties: {
        merchantName: { type: Type.NUMBER },
        storeAddress: { type: Type.NUMBER },
        purchasedAt: { type: Type.NUMBER },
        currency: { type: Type.NUMBER },
        totalCents: { type: Type.NUMBER },
      },
      required: ["merchantName", "storeAddress", "purchasedAt", "currency", "totalCents"],
    },
  },
  required: [
    "merchantName",
    "storeAddress",
    "branchClues",
    "phone",
    "purchasedAt",
    "currency",
    "subtotalCents",
    "taxCents",
    "totalCents",
    "items",
    "confidence",
  ],
};

const prompt = `Extract a grocery receipt into the JSON schema.
Money must be integer cents. Do not guess barcodes. If a field is unreadable, lower its confidence.
Preserve the raw product text exactly, then add a normalized name, brand, quantity, package size, and unit.
Never invent a store that is not printed on the receipt.`;

export async function extractReceiptWithGemini(
  imageBytes: Buffer,
  mimeType: string,
  model: string,
): Promise<ExtractedReceipt> {
  const env = getServerEnv();
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: imageBytes.toString("base64"),
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: receiptSchema,
      temperature: 0.1,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }
  return extractedReceiptSchema.parse(JSON.parse(text));
}

const discoveredStoreSchema = z.object({
  found: z.boolean(),
  name: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export async function searchStoreWithGemini(args: {
  merchantName: string;
  marketName: string;
}): Promise<{
  placeId: null;
  name: string;
  address: string | null;
  lat: null;
  lng: null;
  businessStatus: null;
  phone: string | null;
} | null> {
  const env = getServerEnv();
  if (!env.GEMINI_API_KEY) {
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: `Search the public web for this grocery store in this market.
Merchant printed on the receipt: ${args.merchantName}
Market: ${args.marketName}

Return only JSON with this shape:
{"found":true,"name":"...","address":"...","phone":null,"confidence":0.9}
If there is no unique real match in that market, return:
{"found":false,"name":null,"address":null,"phone":null,"confidence":0}

Do not invent an address. The address must include the market name.`,
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.1,
    },
  });

  const text = response.text;
  if (!text) {
    return null;
  }
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
  const parsed = discoveredStoreSchema.safeParse(parsedJson);
  if (!parsed.success || !parsed.data.found || !parsed.data.name || parsed.data.confidence < 0.75) {
    return null;
  }
  return {
    placeId: null,
    name: parsed.data.name,
    address: parsed.data.address,
    lat: null,
    lng: null,
    businessStatus: null,
    phone: parsed.data.phone,
  };
}


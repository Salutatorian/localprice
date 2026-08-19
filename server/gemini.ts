import { z } from "zod";
import { GoogleGenAI, HarmBlockThreshold, HarmCategory, Type } from "@google/genai";
import { getServerEnv } from "@/lib/env";
import { extractedReceiptSchema, type ExtractedReceipt } from "@/domain/extraction";
import { passesReceiptGate, type ReceiptGateResult } from "@/domain/receipt-gate";

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

const imageSafetySettings = [
  { category: HarmCategory.HARM_CATEGORY_IMAGE_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_IMAGE_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_IMAGE_HATE, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_IMAGE_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const receiptGateSchema = {
  type: Type.OBJECT,
  properties: {
    isReceipt: { type: Type.BOOLEAN },
    confidence: { type: Type.NUMBER },
  },
  required: ["isReceipt", "confidence"],
};

export async function classifyGroceryReceiptImage(
  imageBytes: Buffer,
  mimeType: string,
): Promise<ReceiptGateResult> {
  const env = getServerEnv();
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Decide if this image is a real grocery or drugstore receipt (paper thermal ticket, printed store receipt, or a photo/screenshot of one).
Return JSON only.
isReceipt must be false for people, body parts, memes, IDs, chats, random objects, empty frames, or anything that is not a store receipt.`,
            },
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
        responseSchema: receiptGateSchema,
        temperature: 0,
        safetySettings: imageSafetySettings,
      },
    });
    const text = response.text;
    if (!text) {
      return { isReceipt: false, confidence: 0 };
    }
    const parsed = z.object({ isReceipt: z.boolean(), confidence: z.number().min(0).max(1) }).parse(JSON.parse(text));
    return parsed;
  } catch {
    return { isReceipt: false, confidence: 0 };
  }
}

const prompt = `This image may be a camera photo or a phone screenshot of a grocery receipt.
Read the ENTIRE receipt from top to bottom. Extract every purchased grocery line item, not a sample.
Include header fields: merchant name, address, phone, date, subtotal, tax, total.
Skip ads, coupons, loyalty points, and payment-card lines that are not products.
Money must be integer cents. Do not guess barcodes. If a field is unreadable, lower its confidence.
Preserve the raw product text exactly, then add a normalized name, brand, quantity, package size, and unit.
Do not drop items to make the math match. Never invent a store that is not printed on the receipt.
If this is not a store receipt, do not invent line items.`;

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
      safetySettings: imageSafetySettings,
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
    contents: `Reverse-search the public web to confirm this grocery store physically exists in ${args.marketName}.
Use the merchant name and market only. Do not look up a phone number or street address from a receipt.

Merchant name: ${args.merchantName}
Market: ${args.marketName}

Return only JSON with this shape:
{"found":true,"name":"...","address":"...","phone":null,"confidence":0.9}
If there is no unique real store in that market, or the only hits are in another island or country, return:
{"found":false,"name":null,"address":null,"phone":null,"confidence":0}

Do not invent an address. The address must clearly be in ${args.marketName} (or CNMI / MP 96950 when the market is Saipan).`,
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


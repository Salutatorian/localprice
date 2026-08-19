# Cost controls

- Gemini model is `GEMINI_MODEL` (default `gemini-2.5-flash`). A stronger `GEMINI_MODEL_RETRY` runs once after validation failure.
- Google Places uses Text Search with a four-field mask and `places_cache`. Registry aliases are checked first.
- Receipts are resized to 1600px JPEG before upload.
- Rate limits cap uploads and extraction per user per hour.
- `api_usage` records provider calls for later review.

// Claude Vision API — extracts structured data from rate confirmation documents
// Called directly from the browser using the API key stored in localStorage.

const RATE_CON_PROMPT = `This is a freight rate confirmation document. Extract the following information and return ONLY valid JSON with no other text:

{
  "broker": {
    "companyName": "",
    "contactName": "",
    "email": "",
    "phone": "",
    "address": "",
    "mcNumber": "",
    "dotNumber": ""
  },
  "reference": {
    "brokerLoadNumber": "",
    "referenceNumber": "",
    "poNumber": ""
  },
  "rate": {
    "amount": 0,
    "type": "flat",
    "miles": 0,
    "ratePerMile": 0
  },
  "pickup": {
    "facilityName": "",
    "address": "",
    "city": "",
    "state": "",
    "zip": "",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "contactName": "",
    "contactPhone": "",
    "appointmentRequired": false,
    "referenceNumber": ""
  },
  "delivery": {
    "facilityName": "",
    "address": "",
    "city": "",
    "state": "",
    "zip": "",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "contactName": "",
    "contactPhone": "",
    "appointmentRequired": false,
    "referenceNumber": ""
  },
  "commodity": "",
  "weight": "",
  "equipment": "",
  "specialInstructions": "",
  "detentionRate": "",
  "layoverRate": ""
}

If a field cannot be found, leave it as empty string or 0 for numbers. Return ONLY the JSON, no explanation.`;

// Detect MIME type from a file or data URL
export const getMimeType = (file) => {
  if (file.type) return file.type;
  const name = file.name || '';
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
};

// Convert a File object to base64 string
export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result is "data:image/jpeg;base64,XXXX"
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Compress an image file to keep it under ~1MB
export const compressImage = (file, maxWidthPx = 1600, quality = 0.85) =>
  new Promise((resolve) => {
    // Skip compression for PDFs
    if (file.type === 'application/pdf') {
      resolve(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidthPx) {
        height = Math.round((height * maxWidthPx) / width);
        width = maxWidthPx;
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });

// Main scan function
// Returns the extracted rate con data as a plain object
export const scanRateCon = async (file, apiKey, onProgress) => {
  if (!apiKey) throw new Error('No Claude API key configured. Add one in Settings.');

  onProgress && onProgress('Preparing document...');

  // Compress image if needed
  const processed = await compressImage(file);
  const mimeType = getMimeType(processed);
  const base64Data = await fileToBase64(processed);

  onProgress && onProgress('Sending to Claude Vision...');

  // Claude supports PDF as a document type, images as image type
  const isPdf = mimeType === 'application/pdf';

  const messageContent = isPdf
    ? [
        {
          type: 'document',
          source: { type: 'base64', media_type: mimeType, data: base64Data },
        },
        { type: 'text', text: RATE_CON_PROMPT },
      ]
    : [
        {
          type: 'image',
          source: { type: 'base64', media_type: mimeType, data: base64Data },
        },
        { type: 'text', text: RATE_CON_PROMPT },
      ];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: messageContent }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  onProgress && onProgress('Extracting data...');

  const result = await response.json();
  const text = result.content?.[0]?.text || '';

  // Extract JSON from the response (Claude might wrap it in markdown)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse response from Claude');

  const extracted = JSON.parse(jsonMatch[0]);
  onProgress && onProgress('Done!');
  return extracted;
};

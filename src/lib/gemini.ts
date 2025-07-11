export interface GeminiEmailPreferences {
  message: string;
  tone?: string;
  template?: string;
  signature?: string;
  clientName?: string;
}

export async function getGeminiReply(
  opts: GeminiEmailPreferences
): Promise<{ subject: string; body: string; closing: string; signature: string; trigger?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  // Build prompt with user preferences
  const prompt = `You are Digipod, an AI assistant for creative agencies. Generate a polished, professional email reply in JSON format.\n\nPreferences:\n- Tone: ${opts.tone || 'professional'}\n- Template: ${opts.template || 'default'}\n- Signature (user name): ${opts.signature || '[User Signature]'}\n- Client Name: ${opts.clientName || '[Client Name]'}\n\nIMPORTANT: ALWAYS use the provided client name and user name as variables in the email.\n- For the greeting, use: Dear {{CLIENT NAME}},\n- For the sign-off, use: Best regards,\n  Your {{USER NAME}}\n- Substitute {{CLIENT NAME}} with the provided client name, and {{USER NAME}} with the provided signature/user name.\n- NEVER use placeholders like 'Client', 'Your Name', or any generic text.\n\nYour ONLY response should be a valid JSON object in this format, with no extra text or explanation:\n{\n  "subject": string,\n  "body": string,\n  "closing": string,\n  "signature": string,\n  "trigger": "client_approved" | "client_left_feedback" | null\n}\n\nThe email should be well-formatted, with a clear subject, a greeting (use the provided client name), a main body, a closing, and the signature (use the provided signature/user name).\n\nClient message: "${opts.message}"`;

  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=' + apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 },
    }),
  });
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) {
    console.error('Gemini API returned empty response:', data);
    return { subject: '', body: 'Sorry, I could not process the message.', closing: '', signature: opts.signature || '', trigger: undefined };
  }
  try {
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    const json = JSON.parse(jsonText);
    if (typeof json.subject === 'string' && typeof json.body === 'string' && typeof json.closing === 'string' && typeof json.signature === 'string') {
      return { subject: json.subject, body: json.body, closing: json.closing, signature: json.signature, trigger: json.trigger };
    } else {
      throw new Error('Missing fields in JSON');
    }
  } catch (err) {
    console.error('Failed to parse Gemini response as JSON:', text, err);
    console.error('Full Gemini API response:', JSON.stringify(data, null, 2));
    return { subject: '', body: text, closing: '', signature: opts.signature || '', trigger: undefined };
  }
}

export async function classifyClientIntent(message: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const prompt = `You are a smart AI email assistant for a creative agency tool. Your job is to classify the client's message into one of the following intents:
- approve_phase_move
- revision_requested
- question
- no_action
- unsure (if the message is vague or ambiguous)
Return only the label, nothing else.
Client message: "${message}"`;

  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=' + apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text.trim().toLowerCase();
}

// Improved AI prompt for extracting actionable tasks from email bodies
export async function extractEmailTodos(emailBody: string): Promise<Array<{ task: string; dueDate: string | null; source: string; confidence: number }>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const prompt = `You are an intelligent assistant that reads email messages and extracts actionable tasks for the user.\n\nInstructions:\n- Carefully read the email body below.\n- Identify any requests, assignments, deadlines, or follow-up actions that the user is expected to do.\n- Ignore greetings, signatures, and non-actionable information.\n- If there are multiple tasks, list each one separately.\n- If there are no actionable tasks, return an empty list.\n\nOutput format:\nRespond with a JSON array of objects, each with these fields:\n- \"task\": A concise description of the action required (max 120 characters).\n- \"dueDate\": The due date if mentioned, otherwise null.\n- \"source\": \"email\"\n- \"confidence\": A number from 0 to 1 indicating your confidence this is a real to-do.\n\nExample output:\n\`\`\`json\n[\n  { \"task\": \"Send the signed contract to John\", \"dueDate\": \"2024-07-01\", \"source\": \"email\", \"confidence\": 0.95 },\n  { \"task\": \"Schedule a meeting with the design team\", \"dueDate\": null, \"source\": \"email\", \"confidence\": 0.85 }\n]\`\`\`\n\nEmail body:\n\`\`\`\n${emailBody}\`\`\`
`;

  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=' + apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 },
    }),
  });
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) return [];
  try {
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    const todos = JSON.parse(jsonText);
    if (Array.isArray(todos)) return todos;
    return [];
  } catch (err) {
    console.error('Failed to parse Gemini todos response as JSON:', text, err);
    return [];
  }
}

type EmailForDraft = {
  body?: string;
  snippet?: string;
  userName?: string;
  clientName?: string;
};

export async function generateAIDraftReply(email: EmailForDraft): Promise<string> {
  const opts = {
    message: email.body || email.snippet || '',
    tone: 'professional',
    signature: email.userName || '',
    clientName: email.clientName || '',
  };
  const reply = await getGeminiReply(opts);
  return reply.body;
} 
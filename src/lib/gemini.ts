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
  const prompt = `You are Digipod, an AI assistant for creative agencies. Generate a polished, professional email reply in JSON format.\n\nPreferences:\n- Tone: ${opts.tone || 'professional'}\n- Template: ${opts.template || 'default'}\n- Client Name: ${opts.clientName || '[Client Name]'}\n\nIMPORTANT: DO NOT include any signature, sign-off, or closing in your reply. ONLY generate the subject and the main body of the email. The signature will be added separately by the application.\n- For the greeting, use: Dear {{CLIENT NAME}},\n- Substitute {{CLIENT NAME}} with the provided client name.\n- NEVER use placeholders like 'Client', 'Your Name', or any generic text.\n\nYour ONLY response should be a valid JSON object in this format, with no extra text or explanation:\n{\n  "subject": string,\n  "body": string,\n  "closing": "",\n  "signature": "",\n  "trigger": "client_approved" | "client_left_feedback" | null\n}\n\nThe email should be well-formatted, with a clear subject, a greeting (use the provided client name), and a main body.\n\nClient message: "${opts.message}"`;

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

// Gemini API call helper (placeholder)
export async function callGeminiAPI(message: string): Promise<{ action: string, params: Record<string, unknown> }> {
  const lower = message.toLowerCase();
  if (lower.includes('todo') || lower.includes('to-do') || lower.includes('task') || lower.includes('remind')) {
    let task = '';
    const quoted = message.match(/['"]([^'\"]+)['"]/);
    if (quoted) {
      task = quoted[1];
    } else {
      const match = message.match(/(?:add|create|remind me to) (.+)/i);
      task = match ? match[1] : 'a new task';
    }
    // Only treat as list if the prompt starts with or is about listing/showing, not adding
    if (
      (lower.startsWith('list') || lower.startsWith('show') || lower.startsWith('display')) &&
      (lower.includes('todo') || lower.includes('to-do') || lower.includes('task'))
    ) {
      return { action: 'list_todos', params: {} };
    }
    return { action: 'add_todo', params: { task } };
  }
  if (lower.includes('create project') || lower.includes('new project')) {
    const match = message.match(/project (?:called|named)? ?['"]?([^'\"]+)['"]?/i);
    return { action: 'create_project', params: { name: match ? match[1] : 'Untitled Project' } };
  }
  if (lower.includes('list projects') || lower.includes('all projects')) {
    return { action: 'list_projects', params: {} };
  }
  if (lower.includes('project status') || lower.includes('status of')) {
    const match = message.match(/status of ['"]?([^'\"]+)['"]?/i);
    return { action: 'get_project_status', params: { name: match ? match[1] : '' } };
  }
  if (lower.includes('advance phase') || lower.includes('next phase')) {
    const match = message.match(/project ['"]?([^'\"]+)['"]?/i);
    return { action: 'advance_phase', params: { name: match ? match[1] : '' } };
  }
  if (lower.includes('metrics') || lower.includes('stats')) {
    return { action: 'get_metrics', params: {} };
  }
  if (lower.includes('ai draft')) {
    if (lower.includes('approve')) {
      return { action: 'approve_ai_draft', params: {} };
    }
    return { action: 'list_ai_drafts', params: {} };
  }
  if (lower.includes('client')) {
    if (lower.includes('add')) {
      const match = message.match(/add ['"]?([^'\"]+@[^'\"]+)['"]?/i);
      return { action: 'add_client_filter', params: { email: match ? match[1] : '' } };
    }
    if (lower.includes('list') || lower.includes('all clients')) {
      return { action: 'list_clients', params: {} };
    }
  }
  if (lower.includes('payment')) {
    return { action: 'show_payments', params: {} };
  }
  if (lower.includes('what can you do') || lower.includes('help') || lower.includes('capabilities')) {
    return { action: 'help', params: {} };
  }
  // Fallback: try to extract a to-do using Gemini
  const todos = await extractEmailTodos(message);
  if (todos && todos.length > 0) {
    const todo = todos[0];
    return { action: 'add_todo', params: { task: todo.task, dueDate: todo.dueDate } };
  }
  return { action: 'unknown', params: {} };
} 
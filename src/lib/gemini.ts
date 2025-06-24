export async function getGeminiReply(message: string): Promise<{ replyText: string; trigger?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  // Improved strict prompt for Gemini
  const prompt = `You are Digipod, an AI assistant for creative agencies.\n\nYour ONLY response should be a valid JSON object in this format, with no extra text or explanation:\n{\n  \"replyText\": string,\n  \"trigger\": \"client_approved\" | \"client_left_feedback\" | null\n}\n\nreplyText should be a helpful, professional reply to the client.\n\nSet trigger to \"client_approved\" if the client message clearly indicates approval, acceptance, or a desire to move forward, such as:\n- \"approved\"\n- \"looks good\"\n- \"go ahead\"\n- \"let's move to next phase\"\n- \"proceed\"\n- \"sounds good\"\n- \"I am happy with this\"\n- \"ready for next step\"\n- \"move forward\"\n- \"continue\"\n- \"all set\"\n- \"let's do it\"\n- or any similar phrase.\n\nSet trigger to \"client_left_feedback\" if the client is giving feedback but not clear approval.\nSet trigger to null if there is no clear approval or feedback.\n\nClient message: \"${message}\"`;

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
    return { replyText: 'Sorry, I could not process the message.' };
  }
  try {
    // Handle markdown-wrapped JSON responses
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const json = JSON.parse(jsonText);
    if (typeof json.replyText === 'string') {
      return { replyText: json.replyText, trigger: json.trigger };
    } else {
      throw new Error('replyText missing in JSON');
    }
  } catch (err) {
    console.error('Failed to parse Gemini response as JSON:', text, err);
    console.error('Full Gemini API response:', JSON.stringify(data, null, 2));
    return { replyText: text };
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
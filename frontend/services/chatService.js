const API_URL = "http://localhost:8000/api/chat";
const STREAM_URL = "http://localhost:8000/api/chat/stream";

export const sendMessage = async (message, sessionId) => {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        message,
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

/**
 * Stream a chat response via SSE.
 * @param {string} message
 * @param {string} sessionId
 * @param {(token: string) => void} onToken  — called for each text chunk
 * @returns {Promise<string>} the full response once streaming finishes
 */
export const sendMessageStream = async (message, sessionId, onToken) => {
  const response = await fetch(STREAM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE lines
    const lines = buffer.split("\n");
    // Keep the last (possibly incomplete) line in the buffer
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      try {
        const payload = JSON.parse(trimmed.slice(6));

        if (payload.error) {
          throw new Error(payload.error);
        }
        if (payload.done) {
          return fullText;
        }
        if (payload.token) {
          fullText += payload.token;
          onToken(payload.token);
        }
      } catch (e) {
        if (e.message !== "Unexpected end of JSON input") {
          console.error("SSE parse error:", e);
        }
      }
    }
  }

  return fullText;
};

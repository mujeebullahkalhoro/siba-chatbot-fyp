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
          // Add a small delay for smoother typing effect
          await new Promise(resolve => setTimeout(resolve, 30));
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

const HISTORY_API_URL = "http://localhost:8000/api/chats";

export const getChatSessions = async () => {
  const response = await fetch(HISTORY_API_URL, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!response.ok) {
    console.error("getChatSessions failed:", response.status, response.statusText);
    throw new Error("Failed to fetch chat sessions");
  }
  return await response.json();
}

export const createChatSession = async (title = "New Chat") => {
  const response = await fetch(HISTORY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ title }),
  });
  if (!response.ok) throw new Error("Failed to create chat session");
  return await response.json();
}

export const deleteChatSession = async (sessionId) => {
  const response = await fetch(`${HISTORY_API_URL}/${sessionId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to delete chat session");
  return await response.json();
}

export const getChatMessages = async (sessionId) => {
  const response = await fetch(`${HISTORY_API_URL}/${sessionId}/messages`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to fetch chat messages");
  return await response.json();
}

export const shareChatSession = async (sessionId) => {
  const response = await fetch(`${HISTORY_API_URL}/${sessionId}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to share chat session");
  return await response.json();
}

export const getSharedChat = async (shareId) => {
  // Note: This is a public endpoint, no credentials needed usually, 
  // but if backend requires it (unlikely for public share), we might need it.
  // Routes say: @router.get("/api/shared/{share_id}") -> public
  const response = await fetch(`http://localhost:8000/api/shared/${shareId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to fetch shared chat");
  return await response.json();
}

export const submitFeedback = async (data) => {
  const response = await fetch("http://localhost:8000/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to submit feedback");
  return await response.json();
};

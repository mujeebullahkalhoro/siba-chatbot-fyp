const API_URL = "http://localhost:8000/api/chat";

export const sendMessage = async (message, sessionId) => {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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

// Direct client-side Gemini API service
// Allows Study Buddy to run 100% serverless anywhere in the world!

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || (typeof atob !== 'undefined' ? atob("QVEuQWI4Uk42TDUxcTRxclp3b1Q2RXZOSGpYQUdheEJEblNCamxicFUyQ2VlaWd3dmNSRWc=") : "")
const MODELS = ["gemini-3.6-flash", "gemini-3.7-flash"]

export async function callGeminiDirect(prompt, systemInstruction = "") {
  for (const model of MODELS) {
    try {
      const payload = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      }
      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }]
        }
      }

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!res.ok) continue
      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) return text
    } catch (e) {
      console.warn(`Model ${model} failed:`, e)
    }
  }
  throw new Error("AI is currently busy. Please try again in 10 seconds.")
}

export async function callGeminiVisionDirect(base64Image, prompt) {
  for (const model of MODELS) {
    try {
      const payload = {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Image
                }
              },
              { text: prompt }
            ]
          }
        ]
      }

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!res.ok) continue
      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) return text
    } catch (e) {
      console.warn(`Vision model ${model} failed:`, e)
    }
  }
  throw new Error("Could not process the image. Please try again.")
}

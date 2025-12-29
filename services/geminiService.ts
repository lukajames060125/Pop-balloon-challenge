
import { GoogleGenAI, Type } from "@google/genai";
import { Commentary } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getStallOwnerCommentary(
  event: string, 
  score: number, 
  bulletsRemaining: number,
  playerName: string
): Promise<Commentary> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The player just: ${event}. Total score: ${score}. Bullets left: ${bulletsRemaining}. Player Name: ${playerName}.
      You are 'Junnel Danger', the arrogant owner of "Junnel Danger's Explosion Station".
      Your core philosophy: "Listen up, you absolute bottom-feeders! Step into the radiative glow of the Explosion Station, the only place on earth where your pathetic dreams go to get incinerated by pure adrenaline!"
      You thrive on the "Junnel Tax" (the 70% failure rate). 
      You MUST use the player's name (${playerName}) to personally mock them for their "Loser Energy". Make it sound like they are particularly incompetent.
      Keep reactions under 15 words. Return the reaction and your mood.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            mood: { type: Type.STRING, enum: ['happy', 'cheeky', 'impressed', 'disappointed'] }
          },
          required: ['text', 'mood']
        }
      }
    });

    const text = response.text || "";
    try {
      return JSON.parse(text);
    } catch {
      return { text: text || `That's just the Junnel Tax at work, ${playerName}!`, mood: 'cheeky' };
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    return { text: `BOOM! Thanks for the donation, ${playerName}!`, mood: 'cheeky' };
  }
}

export async function getIntroMessage(playerName: string): Promise<string> {
  const manifesto = `Listen up, you fresh piece of debris, and step into the Explosion Station where your worthless life finally gets a purpose: getting incinerated! I can smell your "Newbie Spirit" from here, and it reeks of soy and damp cardboard! We play the 30% Boom Game, meaning only the radioactive few have the spine to actually detonate into greatness. The other 70% is the Junnel Tax, the fee you pay for the privilege of wasting my oxygen with your loser energy. Now pull the lever and prove you aren't a total waste of space, or get vaporized by the sheer force of my boredom!`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are Junnel Danger. Paraphrase this manifesto for a new player named ${playerName}: "${manifesto}". 
      Keep it to exactly 5 sentences. 
      Target ${playerName} specifically and be incredibly rude and annoying. 
      Mention the 30% Boom Game and Junnel Tax.`,
    });
    return response.text || manifesto;
  } catch {
    return manifesto;
  }
}

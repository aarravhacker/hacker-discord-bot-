const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

const genAI = config.geminiApiKey ? new GoogleGenerativeAI(config.geminiApiKey) : null;
const conversationHistory = new Map();
const COOLDOWN_MS = 3000;
const userCooldowns = new Map();

const GREETINGS = /^(hello|hi|hey|yo|hei|o|sup|hiya|hola|namaste|howdy|greetings|good\s*morning|good\s*afternoon|good\s*evening|kaise|kya\s*haal|kaise\s*ho|aur\s*bta|bta|sun|sunno|suno|bhai|bro|dude|boss|mate|helloo|heyy|heyyyy|heloo|hlo|hlw|hii|heii|heyy|yo yo|arre|oye|eh|ehh|hey there|hello there)$/i;

const CASUAL_REPLIES = [
  "Hey! What's up?",
  "Yo! How's it going?",
  "Hi there!",
  "Heyy!",
  "Hello!",
  "What's good?",
  "Hey, what's happening?",
  "Yo yo!",
  "Hi! Need anything?",
  "Hey! How can I help?",
  "Sup!",
  "Hey there!",
  "What's up bro!",
  "Hi hi!",
  "Yooo!"
];

const HOW_ARE_YOU_REPLIES = [
  "I'm good! Just chilling in the server. You?",
  "Doing great! Thanks for asking. How about you?",
  "All good here! What about you?",
  "Pretty good! Just vibing. You?",
  "I'm fine! Ready to help with anything."
];

function isOnCooldown(userId) {
  const last = userCooldowns.get(userId) || 0;
  if (Date.now() - last < COOLDOWN_MS) return true;
  userCooldowns.set(userId, Date.now());
  return false;
}

async function aiReply(message) {
  if (!genAI) return false;
  if (isOnCooldown(message.author.id)) return false;

  const text = message.content.trim().toLowerCase();

  if (GREETINGS.test(text)) {
    if (/kya|haal|kaise|aur|bta|sun/i.test(text)) {
      const reply = CASUAL_REPLIES[Math.floor(Math.random() * CASUAL_REPLIES.length)];
      await message.reply(reply);
      return true;
    }
    if (/how\s*are|r u|kais[ei]/i.test(text)) {
      const reply = HOW_ARE_YOU_REPLIES[Math.floor(Math.random() * HOW_ARE_YOU_REPLIES.length)];
      await message.reply(reply);
      return true;
    }
    const reply = CASUAL_REPLIES[Math.floor(Math.random() * CASUAL_REPLIES.length)];
    await message.reply(reply);
    return true;
  }

  return false;
}

async function handleReply(message, client) {
  if (!genAI) return false;
  if (!message.reference) return false;
  if (isOnCooldown(message.author.id)) return false;

  try {
    const replied = await message.fetchReference();
    if (!replied.author.bot) return false;
    if (replied.author.id !== client.user.id) return false;

    const channelId = message.channel.id;
    const userId = message.author.id;
    const key = `${channelId}:${userId}`;

    if (!conversationHistory.has(key)) conversationHistory.set(key, []);
    const history = conversationHistory.get(key);

    history.push({ role: 'user', content: message.content });
    if (history.length > 20) history.shift();

    const historyText = history.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n');

    const model = genAI.getGenerativeModel({ model: config.aiModel });
    const result = await model.generateContent(
      `You are a friendly, casual Discord bot named Hacker. Keep replies SHORT (1-2 sentences max). Be helpful but casual. Don't use emojis excessively.\n\nChat history:\n${historyText}\n\nAI:`
    );
    const response = result.response.text();

    history.push({ role: 'ai', content: response });
    if (history.length > 20) history.shift();

    await message.reply(response.length > 2000 ? response.slice(0, 1997) + '...' : response);
    return true;
  } catch (error) {
    console.error('[AI] Reply chain error:', error.message);
    return false;
  }
}

function clearHistory(channelId, userId) {
  conversationHistory.delete(`${channelId}:${userId}`);
}

function getHistory(channelId, userId) {
  return conversationHistory.get(`${channelId}:${userId}`) || [];
}

module.exports = { aiReply, handleReply, clearHistory, getHistory };

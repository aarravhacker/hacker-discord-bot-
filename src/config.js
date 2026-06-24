module.exports = {
  ownerId: process.env.OWNER_ID || '1334027675873837079',
  clientId: process.env.CLIENT_ID || '',
  clientSecret: process.env.DISCORD_CLIENT_SECRET || process.env.CLIENT_SECRET || '',
  dashboardCallbackUrl: process.env.DISCORD_REDIRECT_URI || process.env.DASHBOARD_CALLBACK_URL || 'http://localhost:3000/auth/callback',
  dashboardSecret: process.env.DASHBOARD_SECRET || 'hacker-bot-dashboard-secret',
  embedColors: {
    success: 0x00ff00,
    error: 0xff0000,
    warning: 0xffff00,
    info: 0x0099ff,
    security: 0xff6600,
    antinuke: 0xff0000,
    antiraid: 0xff3300,
    moderation: 0x0099ff,
    admin: 0x9933ff,
    fun: 0xff69b4,
    economy: 0xffd700,
    music: 0x1db954,
    utility: 0x5865f2,
    primary: 0x5865f2,
    giveaway: 0xffd700,
    poll: 0x0099ff,
    images: 0xffd700,
    level: 0x5865f2
  },
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'gemini-2.0-flash',
  defaultPrefix: '!',
  security: {
    antinuke: {
      maxChannelDelete: 3,
      maxChannelCreate: 3,
      maxRoleDelete: 3,
      maxRoleCreate: 3,
      maxMemberBan: 3,
      maxMemberKick: 3,
      timeWindow: 60000
    },
    antiraid: {
      joinThreshold: 5,
      timeWindow: 10000,
      action: 'kick'
    },
    antibot: {
      action: 'kick'
    },
    antispam: {
      messageLimit: 5,
      timeWindow: 5000,
      action: 'mute'
    }
  }
};

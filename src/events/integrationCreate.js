const { getGuild } = require('../db/guildRepository');
const { addSecurityLog } = require('../db/securityRepository');
const logger = require('../utils/logger');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'integrationCreate',
  async execute(integration) {
    if (!integration.guild) return;

    try {
      const guildData = await getGuild(integration.guild.id);
      if (!guildData.antinuke_enabled) return;

      await addSecurityLog({
        guild_id: integration.guild.id,
        user_id: integration.application?.bot?.id || 'unknown',
        action: 'integration_create',
        type: 'security',
        details: JSON.stringify({ name: integration.name, type: integration.type })
      });

      const logChannel = guildData.log_channel ? integration.guild.channels.cache.get(guildData.log_channel) : null;
      if (logChannel) {
        logChannel.send({ embeds: [new EmbedBuilder()
          .setColor(0xffff00)
          .setTitle('⚠️ Integration Added')
          .setDescription(`**${integration.name}** (${integration.type}) was added to the server`)
          .setTimestamp()] }).catch(() => {});
      }
    } catch (err) {
      logger.error('integrationCreate error:', err);
    }
  }
};

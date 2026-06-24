const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');

const TYPE_NAMES = {
  wordfilter: 'Word Filter',
  spamfilter: 'Spam Filter',
  capsfilter: 'Caps Filter',
  emojispam: 'Emoji Spam',
  antispam: 'Anti-Spam',
  linkfilter: 'Link Filter',
  invitefilter: 'Invite Filter',
  mentionspam: 'Mention Spam'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automodstatus')
    .setDescription('View the status of all auto-moderation systems')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['amstatus', 'modstatus'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const db = getDB();
      const records = await db('automod')
        .where({ guild_id: interaction.guild.id });

      if (records.length === 0) {
        return interaction.reply({ embeds: [infoEmbed('No auto-moderation systems configured. Use `/automod enable` to create one.')] });
      }

      let enabledCount = 0;
      let disabledCount = 0;

      const list = records.map(r => {
        const config = JSON.parse(r.config);
        const name = TYPE_NAMES[r.type] || r.type;
        const status = r.enabled ? '✅ Enabled' : '❌ Disabled';
        if (r.enabled) enabledCount++;
        else disabledCount++;

        return [
          `**${name}**`,
          `  Status: ${status}`,
          `  Action: ${config.action || 'N/A'}`,
          `  Log: ${config.logChannel ? `<#${config.logChannel}>` : 'Not set'}`,
          `  Ignored: ${(config.ignoredRoles || []).length + (config.ignoredChannels || []).length} items`
        ].join('\n');
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setTitle('Auto-Moderation Status')
        .setDescription(list)
        .setColor(embedColors.info)
        .addFields(
          { name: 'Enabled', value: enabledCount.toString(), inline: true },
          { name: 'Disabled', value: disabledCount.toString(), inline: true },
          { name: 'Total', value: records.length.toString(), inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to fetch auto-moderation status.')] });
    }
  }
};

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');
const { errorEmbed, infoEmbed } = require('../../utils/helpers');
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
    .setName('automodlist')
    .setDescription('List all active auto-moderation rules')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['amlist', 'listautomod'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const db = getDB();
      const records = await db('automod')
        .where({ guild_id: interaction.guild.id });

      if (records.length === 0) {
        return interaction.reply({ embeds: [infoEmbed('No auto-moderation rules configured.')] });
      }

      const list = records.map((r, i) => {
        const config = JSON.parse(r.config);
        const name = TYPE_NAMES[r.type] || r.type;
        const status = r.enabled ? '✅' : '❌';
        return `\`${i + 1}\`. ${status} **${name}** — Action: ${config.action || 'N/A'}`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setTitle('Auto-Moderation Rules')
        .setDescription(list)
        .setColor(embedColors.info)
        .setFooter({ text: `Total: ${records.length} rule(s)` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to fetch auto-moderation rules.')] });
    }
  }
};

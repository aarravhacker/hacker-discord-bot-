const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');
const { errorEmbed, infoEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');

const MODULE_TYPES = [
  { name: 'Word Filter', value: 'wordfilter' },
  { name: 'Spam Filter', value: 'spamfilter' },
  { name: 'Caps Filter', value: 'capsfilter' },
  { name: 'Emoji Spam', value: 'emojispam' },
  { name: 'Anti-Spam', value: 'antispam' },
  { name: 'Link Filter', value: 'linkfilter' },
  { name: 'Invite Filter', value: 'invitefilter' },
  { name: 'Mention Spam', value: 'mentionspam' }
];

const TYPE_NAMES = {};
MODULE_TYPES.forEach(m => { TYPE_NAMES[m.value] = m.name; });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automodconfig')
    .setDescription('View detailed config of an auto-moderation module')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('module')
        .setDescription('Module to check')
        .setRequired(true)
        .addChoices(...MODULE_TYPES)
    ),
  cooldown: 5,
  aliases: ['amconfig', 'modconfig'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const moduleType = args?.[0] || interaction.options?.getString('module');
      if (!moduleType) return interaction.reply({ embeds: [errorEmbed('Please specify a module.')] });

      const db = getDB();
      const record = await db('automod')
        .where({ guild_id: interaction.guild.id, type: moduleType })
        .first();

      if (!record) {
        return interaction.reply({ embeds: [infoEmbed(`No configuration found for \`${TYPE_NAMES[moduleType] || moduleType}\`.`)] });
      }

      const config = JSON.parse(record.config);
      const configStr = Object.entries(config)
        .map(([k, v]) => `**${k}:** ${Array.isArray(v) ? v.length + ' items' : JSON.stringify(v)}`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setTitle(`${TYPE_NAMES[moduleType] || moduleType} Configuration`)
        .setDescription(configStr.length > 2048 ? configStr.substring(0, 2040) + '...' : configStr)
        .setColor(embedColors.info)
        .addFields(
          { name: 'Status', value: record.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'ID', value: record.id.toString(), inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to fetch module config.')] });
    }
  }
};

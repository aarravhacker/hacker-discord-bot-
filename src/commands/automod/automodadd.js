const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
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

const DEFAULT_CONFIGS = {
  wordfilter: { words: [], action: 'warn', logChannel: null, ignoredRoles: [], ignoredChannels: [] },
  spamfilter: { limit: 5, time: 5, action: 'warn', logChannel: null, ignoredRoles: [], ignoredChannels: [] },
  capsfilter: { limit: 70, minChars: 5, action: 'warn', logChannel: null, ignoredRoles: [], ignoredChannels: [] },
  emojispam: { limit: 10, action: 'warn', logChannel: null, ignoredRoles: [], ignoredChannels: [] },
  antispam: { messageThreshold: 5, timeWindow: 10, duplicateThreshold: 3, linkThreshold: 3, mentionThreshold: 5, action: 'warn', logChannel: null, ignoredRoles: [], ignoredChannels: [] },
  linkfilter: { whitelistedDomains: [], action: 'warn', logChannel: null, ignoredRoles: [], ignoredChannels: [] },
  invitefilter: { action: 'warn', logChannel: null, ignoredRoles: [], ignoredChannels: [] },
  mentionspam: { limit: 5, action: 'warn', logChannel: null, ignoredRoles: [], ignoredChannels: [] }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automodadd')
    .setDescription('Add a new auto-moderation rule')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Type of rule')
        .setRequired(true)
        .addChoices(...MODULE_TYPES)
    )
    .addStringOption(opt =>
      opt.setName('action').setDescription('Action on violation').setRequired(false)
        .addChoices(
          { name: 'Delete', value: 'delete' },
          { name: 'Warn', value: 'warn' },
          { name: 'Mute', value: 'mute' },
          { name: 'Kick', value: 'kick' },
          { name: 'Ban', value: 'ban' }
        )
    ),
  cooldown: 3,
  aliases: ['amadd', 'addautomod'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const type = args?.[0] || interaction.options?.getString('type');
      const action = args?.[1] || interaction.options?.getString('action') || 'warn';

      if (!type) return interaction.reply({ embeds: [errorEmbed('Please specify a rule type.')] });

      const db = getDB();
      const existing = await db('automod')
        .where({ guild_id: interaction.guild.id, type })
        .first();

      if (existing) {
        return interaction.reply({ embeds: [errorEmbed(`A \`${TYPE_NAMES[type] || type}\` rule already exists. Use automodconfig to modify it.`)] });
      }

      const config = DEFAULT_CONFIGS[type] || { action, logChannel: null, ignoredRoles: [], ignoredChannels: [] };
      config.action = action;

      await db('automod').insert({
        guild_id: interaction.guild.id,
        type,
        config: JSON.stringify(config),
        enabled: true
      });

      const embed = new EmbedBuilder()
        .setTitle('Auto-Mod Rule Added')
        .setDescription(`Added **${TYPE_NAMES[type] || type}** rule with action **${action}**.`)
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to add auto-mod rule.')] });
    }
  }
};

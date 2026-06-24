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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automodremove')
    .setDescription('Remove an auto-moderation rule')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Type of rule to remove')
        .setRequired(true)
        .addChoices(...MODULE_TYPES)
    ),
  cooldown: 3,
  aliases: ['amremove', 'removeautomod'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const type = args?.[0] || interaction.options?.getString('type');
      if (!type) return interaction.reply({ embeds: [errorEmbed('Please specify a rule type to remove.')] });

      const db = getDB();
      const deleted = await db('automod')
        .where({ guild_id: interaction.guild.id, type })
        .del();

      if (!deleted) {
        return interaction.reply({ embeds: [errorEmbed(`No \`${TYPE_NAMES[type] || type}\` rule found.`)] });
      }

      const embed = new EmbedBuilder()
        .setTitle('Auto-Mod Rule Removed')
        .setDescription(`Removed **${TYPE_NAMES[type] || type}** rule.`)
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to remove auto-mod rule.')] });
    }
  }
};

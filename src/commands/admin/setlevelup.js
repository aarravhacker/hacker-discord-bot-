const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlevelup')
    .setDescription('Configure level-up messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Level-up channel').addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption(opt => opt.setName('message').setDescription('Level-up message (use {user}, {level}, {xp})'))
    .addNumberOption(opt => opt.setName('xprate').setDescription('XP multiplier (e.g. 2 for double)').setMinValue(0.1).setMaxValue(10)),
  cooldown: 5,
  aliases: ['levelupconfig', 'lvlconfig'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
      try {
            const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);
            const message = interaction.options?.getString('message') || args?.[1];
            const xpRate = interaction.options?.getNumber('xprate') || parseFloat(args?.[2]);

            const updates = {};
            if (channel) updates.levelUpChannelId = channel.id;
            if (message) updates.levelUpMessage = message;
            if (xpRate) updates.xpRate = xpRate;

            if (Object.keys(updates).length === 0) {
              return interaction.reply({ embeds: [errorEmbed('Provide at least one option: channel, message, or xprate.')] });
            }

            await updateGuild(interaction.guild.id, updates);

            const response = [];
            if (channel) response.push(`Level-up channel: ${channel}`);
            if (message) response.push(`Level-up message: ${message.slice(0, 1024)}`);
            if (xpRate) response.push(`XP Rate: ${xpRate}x`);
            response.push('\nPlaceholders: `{user}`, `{level}`, `{xp}`');

            await interaction.reply({ embeds: [successEmbed(`Level-up configured!\n${response.join('\n')}`)] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
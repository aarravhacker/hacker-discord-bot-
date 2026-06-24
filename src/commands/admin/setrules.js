const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setrules')
    .setDescription('Set the rules channel and content')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Rules channel').addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption(opt => opt.setName('rules').setDescription('Rules content (supports embeds)')),
  cooldown: 5,
  aliases: ['rulesconfig'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
      try {
            const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);
            const rules = interaction.options?.getString('rules') || args?.slice(1).join(' ');

            const updates = {};
            if (channel) updates.rulesChannelId = channel.id;
            if (rules) updates.rulesContent = rules;

            if (Object.keys(updates).length === 0) {
              return interaction.reply({ embeds: [errorEmbed('Provide at least a channel or rules content.')] });
            }

            await updateGuild(interaction.guild.id, updates);

            const response = [];
            if (channel) response.push(`Rules channel: ${channel}`);
            if (rules) response.push(`Rules: ${rules.slice(0, 1024)}`);

            await interaction.reply({ embeds: [successEmbed(`Rules configured!\n${response.join('\n')}`)] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlog')
    .setDescription('Set the logging channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Log channel').addChannelTypes(ChannelType.GuildText).setRequired(true)
    ),
  cooldown: 5,
  aliases: ['setlogs', 'logchannel'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
      try {
            const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);
            if (!channel) return interaction.reply({ embeds: [errorEmbed('Please provide a valid text channel.')] });

            await updateGuild(interaction.guild.id, { logChannelId: channel.id });

            await interaction.reply({
              embeds: [successEmbed(`Log channel set to ${channel}\nAll moderation actions will now be logged there.`)]
            });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
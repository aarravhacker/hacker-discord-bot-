const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('messagelogimage')
    .setDescription('Toggle logging of image attachments')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['msglogimage'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const guild = await getGuild(interaction.guildId);
            const enabled = !guild.messageLogImages;
            await updateGuild(interaction.guildId, { messageLogImages: enabled });
            const embed = enabled
              ? successEmbed('Image Logging Enabled', 'Image attachment logging is now **enabled**.')
              : successEmbed('Image Logging Disabled', 'Image attachment logging is now **disabled**.');
            await interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('messagelogdelete')
    .setDescription('Toggle logging of deleted messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['msglogdelete'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const guild = await getGuild(interaction.guildId);
            const enabled = !guild.messageLogDeletes;
            await updateGuild(interaction.guildId, { messageLogDeletes: enabled });
            const embed = enabled
              ? successEmbed('Delete Logging Enabled', 'Deleted message logging is now **enabled**.')
              : successEmbed('Delete Logging Disabled', 'Deleted message logging is now **disabled**.');
            await interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
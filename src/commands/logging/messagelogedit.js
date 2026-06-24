const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('messagelogedit')
    .setDescription('Toggle logging of edited messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['msglogedit'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const guild = await getGuild(interaction.guildId);
            const enabled = !guild.messageLogEdits;
            await updateGuild(interaction.guildId, { messageLogEdits: enabled });
            const embed = enabled
              ? successEmbed('Edit Logging Enabled', 'Edited message logging is now **enabled**.')
              : successEmbed('Edit Logging Disabled', 'Edited message logging is now **disabled**.');
            await interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
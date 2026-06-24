const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('memberlogjoin')
    .setDescription('Toggle logging of member joins')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['memlogjoin'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const guild = await getGuild(interaction.guildId);
            const enabled = !guild.memberLogJoins;
            await updateGuild(interaction.guildId, { memberLogJoins: enabled });
            const embed = enabled
              ? successEmbed('Join Logging Enabled', 'Member join logging is now **enabled**.')
              : successEmbed('Join Logging Disabled', 'Member join logging is now **disabled**.');
            await interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
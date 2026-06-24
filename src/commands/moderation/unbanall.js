const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unbanall')
    .setDescription('Unban all banned users')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  cooldown: 5,
  aliases: ['unbanallusers', 'massunban'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    try {
      const guild = interaction.guild;

      const bans = await guild.bans.fetch();

      if (bans.size === 0) {
        return interaction.reply({
          embeds: [infoEmbed('No banned users found.')],
          ephemeral: true
        });
      }

      let unbannedCount = 0;
      let failedCount = 0;

      for (const [, ban] of bans) {
        try {
          await guild.members.unban(ban.user.id);
          unbannedCount++;
        } catch (error) {
          console.error(`Failed to unban ${ban.user.tag}:`, error);
          failedCount++;
        }
      }

      const embed = successEmbed(
        `Successfully unbanned ${unbannedCount} users.${
          failedCount > 0 ? ` Failed to unban ${failedCount} users.` : ''
        }`
      );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in unbanall command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while unbanning users.')],
        ephemeral: true
      });
    }
  }
};

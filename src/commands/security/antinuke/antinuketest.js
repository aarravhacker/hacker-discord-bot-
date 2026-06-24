const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed, warningEmbed } = require('../../../utils/helpers');
const { addSecurityLog } = require('../../../db/securityRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinuketest')
    .setDescription('Test antinuke protection')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 30,
  aliases: ['antest'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const user = isSlash ? interaction.user : interaction.author;

    try {
      const guildData = await getGuild(guild.id);

      if (!guildData.antinuke_enabled) {
        return interaction.reply({ embeds: [warningEmbed('Warning', 'Antinuke is not enabled. Enable it first with `/antinuke`.')] });
      }

      const antinukeConfig = JSON.parse(guildData.antinuke_config || '{}');

      const embed = infoEmbed(
        'Antinuke Test Results',
        `**Status:** ✅ Active\n` +
        `**Max Channel Delete:** ${antinukeConfig.maxChannelDelete || 3}\n` +
        `**Max Channel Create:** ${antinukeConfig.maxChannelCreate || 3}\n` +
        `**Max Role Delete:** ${antinukeConfig.maxRoleDelete || 3}\n` +
        `**Max Role Create:** ${antinukeConfig.maxRoleCreate || 3}\n` +
        `**Max Member Ban:** ${antinukeConfig.maxMemberBan || 3}\n` +
        `**Max Member Kick:** ${antinukeConfig.maxMemberKick || 3}\n` +
        `**Time Window:** ${(antinukeConfig.timeWindow || 60000) / 1000}s\n` +
        `**Whitelist:** ${JSON.parse(guildData.whitelist || '[]').length} users\n` +
        `**Alert Channel:** ${antinukeConfig.alertChannel ? `<#${antinukeConfig.alertChannel}>` : 'Not set'}`
      );

      await addSecurityLog({
        guild_id: guild.id,
        user_id: user.id,
        action: 'antinuke_test',
        type: 'antinuke',
        details: JSON.stringify({ tested_by: user.id })
      });

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to test antinuke protection.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};

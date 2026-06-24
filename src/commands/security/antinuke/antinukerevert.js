const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getSecurityLogs } = require('../../../db/securityRepository');
const { successEmbed, errorEmbed, warningEmbed, infoEmbed } = require('../../../utils/helpers');
const { addSecurityLog } = require('../../../db/securityRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukerevert')
    .setDescription('Revert recent antinuke-detected actions')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('count').setDescription('Number of actions to revert (1-10)').setMinValue(1).setMaxValue(10)
    ),
  cooldown: 10,
  aliases: ['anrevert'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const moderator = isSlash ? interaction.user : interaction.author;

    try {
      const count = isSlash ? (interaction.options?.getInteger('count') || 5) : parseInt(interaction.content.split(' ')[1]) || 5;

      const logs = await getSecurityLogs(guild.id, 'antinuke', 50);
      const revertableLogs = logs.filter(l =>
        l.action.includes('delete') || l.action.includes('ban') || l.action.includes('kick')
      ).slice(0, count);

      if (revertableLogs.length === 0) {
        return interaction.reply({ embeds: [infoEmbed('Antinuke Revert', 'No revertable actions found.')] });
      }

      let reverted = 0;
      let failed = 0;

      for (const log of revertableLogs) {
        try {
          const details = JSON.parse(log.details || '{}');
          if (log.action.includes('channel_delete') && details.channel) {
            await guild.channels.create(details.name || 'restored-channel', { type: details.type || 0 });
            reverted++;
          } else if (log.action.includes('member_ban') && details.target) {
            await guild.members.unban(details.target, 'Antinuke revert');
            reverted++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      await addSecurityLog({
        guild_id: guild.id,
        user_id: moderator.id,
        action: 'antinuke_revert',
        type: 'antinuke',
        details: JSON.stringify({ reverted, failed })
      });

      const embed = successEmbed(
        'Antinuke Revert',
        `✅ Reverted **${reverted}** actions.\n❌ Failed to revert **${failed}** actions.`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to revert antinuke actions.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};

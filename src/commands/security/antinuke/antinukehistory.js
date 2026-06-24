const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getSecurityLogs } = require('../../../db/securityRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukehistory')
    .setDescription('View antinuke action history for a specific user')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to check history for').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('limit').setDescription('Number of entries to show').setMinValue(1).setMaxValue(25)
    ),
  cooldown: 5,
  aliases: ['anhistory', 'anhist'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      let targetUser;
      let limit = 10;

      if (isSlash) {
        targetUser = interaction.options?.getUser('user');
        limit = interaction.options?.getInteger('limit') || 10;
      } else {
        const mention = interaction.content.split(' ')[1];
        if (!mention) {
          return interaction.reply({ embeds: [errorEmbed('Error', 'Please mention a user.')] });
        }
        const userId = mention.replace(/[<@!>]/g, '');
        targetUser = await interaction.client.users.fetch(userId).catch(() => null);
        limit = parseInt(interaction.content.split(' ')[2]) || 10;
        if (!targetUser) {
          return interaction.reply({ embeds: [errorEmbed('Error', 'User not found.')] });
        }
      }

      const logs = await getSecurityLogs(guild.id, 'antinuke', 100);
      const userLogs = logs.filter(l => l.user_id === targetUser.id).slice(0, limit);

      if (userLogs.length === 0) {
        return interaction.reply({ embeds: [infoEmbed('Antinuke History', `No antinuke actions found for ${targetUser.tag}.`)] });
      }

      const entries = userLogs.map((log, i) => `**${i + 1}.** ${log.action} - <t:${Math.floor(new Date(log.created_at).getTime() / 1000)}:R>`).join('\n');

      const embed = successEmbed(`Antinuke History - ${targetUser.tag}`, entries);

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to fetch antinuke history.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};

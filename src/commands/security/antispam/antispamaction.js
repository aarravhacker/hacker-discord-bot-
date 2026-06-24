const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antispamaction')
    .setDescription('Set the action for antispam violations')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('action').setDescription('Action to take').setRequired(true)
        .addChoices(
          { name: 'warn', value: 'warn' },
          { name: 'mute', value: 'mute' },
          { name: 'kick', value: 'kick' },
          { name: 'ban', value: 'ban' }
        )
    ),
  cooldown: 5,
  aliases: ['asaction'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      let action;

      if (isSlash) {
        action = interaction.options?.getString('action');
      } else {
        action = interaction.content.split(' ')[1]?.toLowerCase();
        if (!action || !['warn', 'mute', 'kick', 'ban'].includes(action)) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Usage: antispamaction <warn|mute|kick|ban>')] });
        }
      }

      const guildData = await getGuild(guild.id);
      let antispamConfig = JSON.parse(guildData.antispam_config || '{}');
      antispamConfig.action = action;
      await updateGuild(guild.id, { antispam_config: JSON.stringify(antispamConfig) });

      const embed = successEmbed(
        'Antispam Action Updated',
        `**Action:** ${action}`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to update antispam action.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidalert')
    .setDescription('Configure raid alert channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel for raid alerts').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['raalert'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      let channelId;

      if (isSlash) {
        channelId = interaction.options?.getChannel('channel').id;
      } else {
        const args = interaction.content.split(' ').slice(1);
        if (!args[0]) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Usage: raidalert <channel>')] });
        }
        channelId = args[0].replace(/[<#>]/g, '');
      }

      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        return interaction.reply({ embeds: [errorEmbed('Error', 'Channel not found.')] });
      }

      const guildData = await getGuild(guild.id);
      let antiraidConfig = JSON.parse(guildData.antiraid_config || '{}');
      antiraidConfig.alertChannel = channelId;
      await updateGuild(guild.id, { antiraid_config: JSON.stringify(antiraidConfig) });

      const embed = successEmbed(
        'Raid Alert Channel',
        `✅ Raid alerts will be sent to <#${channelId}>.`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to set raid alert channel.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};

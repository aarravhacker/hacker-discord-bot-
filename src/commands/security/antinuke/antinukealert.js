const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukealert')
    .setDescription('Configure antinuke alert channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel for antinuke alerts').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['analert'],
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
        if (args.length === 0) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Please specify a channel.')] });
        }
        channelId = args[0].replace(/[<#>]/g, '');
      }

      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        return interaction.reply({ embeds: [errorEmbed('Error', 'Channel not found.')] });
      }

      const guildData = await getGuild(guild.id);
      let antinukeConfig = JSON.parse(guildData.antinuke_config || '{}');
      antinukeConfig.alertChannel = channelId;
      await updateGuild(guild.id, { antinuke_config: JSON.stringify(antinukeConfig) });

      const embed = successEmbed(
        'Antinuke Alert Channel',
        `✅ Antinuke alerts will be sent to <#${channelId}>.`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to set antinuke alert channel.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};

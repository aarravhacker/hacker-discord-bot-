const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../../utils/helpers');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraidconfig')
    .setDescription('Configure antiraid settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('jointhreshold').setDescription('Max joins before action').setMinValue(1).setMaxValue(100)
    )
    .addIntegerOption(opt =>
      opt.setName('timewindow').setDescription('Time window in seconds').setMinValue(5).setMaxValue(300)
    )
    .addStringOption(opt =>
      opt.setName('action').setDescription('Action to take')
        .addChoices(
          { name: 'kick', value: 'kick' },
          { name: 'ban', value: 'ban' },
          { name: 'mute', value: 'mute' },
          { name: 'verify', value: 'verify' }
        )
    ),
  cooldown: 5,
  aliases: ['arconfig'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const guildData = await getGuild(guild.id);
      let antiraidConfig = JSON.parse(guildData.antiraid_config || '{}');

      if (isSlash) {
        const joinThreshold = interaction.options?.getInteger('jointhreshold');
        const timeWindow = interaction.options?.getInteger('timewindow');
        const action = interaction.options?.getString('action');

        if (joinThreshold) antiraidConfig.joinThreshold = joinThreshold;
        if (timeWindow) antiraidConfig.timeWindow = timeWindow * 1000;
        if (action) antiraidConfig.action = action;
      } else {
        const args = interaction.content.split(' ').slice(1);
        const settingsMap = {
          'jointhreshold': 'joinThreshold',
          'timewindow': 'timeWindow',
          'action': 'action'
        };
        for (let i = 0; i < args.length - 1; i += 2) {
          const key = args[i].toLowerCase();
          const value = args[i + 1];
          if (settingsMap[key]) {
            antiraidConfig[settingsMap[key]] = key === 'timewindow' ? parseInt(value) * 1000 : (key === 'action' ? value : parseInt(value));
          }
        }
      }

      const defaults = config.security.antiraid;
      antiraidConfig = {
        joinThreshold: antiraidConfig.joinThreshold || defaults.joinThreshold,
        timeWindow: antiraidConfig.timeWindow || defaults.timeWindow,
        action: antiraidConfig.action || defaults.action
      };

      await updateGuild(guild.id, { antiraid_config: JSON.stringify(antiraidConfig) });

      const embed = successEmbed(
        'Antiraid Configuration Updated',
        `**Join Threshold:** ${antiraidConfig.joinThreshold}\n` +
        `**Time Window:** ${antiraidConfig.timeWindow / 1000}s\n` +
        `**Action:** ${antiraidConfig.action}`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to update antiraid configuration.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};

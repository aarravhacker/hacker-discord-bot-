const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../../utils/helpers');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antispamconfig')
    .setDescription('Configure antispam settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('messagelimit').setDescription('Max messages before action').setMinValue(1).setMaxValue(50)
    )
    .addIntegerOption(opt =>
      opt.setName('timewindow').setDescription('Time window in seconds').setMinValue(1).setMaxValue(60)
    )
    .addStringOption(opt =>
      opt.setName('action').setDescription('Action to take')
        .addChoices(
          { name: 'warn', value: 'warn' },
          { name: 'mute', value: 'mute' },
          { name: 'kick', value: 'kick' },
          { name: 'ban', value: 'ban' }
        )
    ),
  cooldown: 5,
  aliases: ['asconfig'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const guildData = await getGuild(guild.id);
      let antispamConfig = JSON.parse(guildData.antispam_config || '{}');

      if (isSlash) {
        const messageLimit = interaction.options?.getInteger('messagelimit');
        const timeWindow = interaction.options?.getInteger('timewindow');
        const action = interaction.options?.getString('action');

        if (messageLimit) antispamConfig.messageLimit = messageLimit;
        if (timeWindow) antispamConfig.timeWindow = timeWindow * 1000;
        if (action) antispamConfig.action = action;
      } else {
        const args = interaction.content.split(' ').slice(1);
        const settingsMap = {
          'messagelimit': 'messageLimit',
          'timewindow': 'timeWindow',
          'action': 'action'
        };
        for (let i = 0; i < args.length - 1; i += 2) {
          const key = args[i].toLowerCase();
          const value = args[i + 1];
          if (settingsMap[key]) {
            antispamConfig[settingsMap[key]] = key === 'timewindow' ? parseInt(value) * 1000 : (key === 'action' ? value : parseInt(value));
          }
        }
      }

      const defaults = config.security.antispam;
      antispamConfig = {
        messageLimit: antispamConfig.messageLimit || defaults.messageLimit,
        timeWindow: antispamConfig.timeWindow || defaults.timeWindow,
        action: antispamConfig.action || defaults.action
      };

      await updateGuild(guild.id, { antispam_config: JSON.stringify(antispamConfig) });

      const embed = successEmbed(
        'Antispam Configuration Updated',
        `**Message Limit:** ${antispamConfig.messageLimit}\n` +
        `**Time Window:** ${antispamConfig.timeWindow / 1000}s\n` +
        `**Action:** ${antispamConfig.action}`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to update antispam configuration.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};

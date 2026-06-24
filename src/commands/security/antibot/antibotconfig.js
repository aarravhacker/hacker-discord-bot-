const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../../utils/helpers');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antibotconfig')
    .setDescription('Configure antibot settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('action').setDescription('Action against bots')
        .addChoices(
          { name: 'kick', value: 'kick' },
          { name: 'ban', value: 'ban' },
          { name: 'mute', value: 'mute' }
        )
    )
    .addBooleanOption(opt =>
      opt.setName('checkpermissions').setDescription('Check bot permissions')
    )
    .addBooleanOption(opt =>
      opt.setName('verifiedbots').setDescription('Allow verified bots')
    ),
  cooldown: 5,
  aliases: ['abconfig'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const guildData = await getGuild(guild.id);
      let antibotConfig = JSON.parse(guildData.antibot_config || '{}');

      if (isSlash) {
        const action = interaction.options?.getString('action');
        const checkPermissions = interaction.options?.getBoolean('checkpermissions');
        const verifiedBots = interaction.options?.getBoolean('verifiedbots');

        if (action) antibotConfig.action = action;
        if (checkPermissions !== null) antibotConfig.checkPermissions = checkPermissions;
        if (verifiedBots !== null) antibotConfig.allowVerified = verifiedBots;
      } else {
        const args = interaction.content.split(' ').slice(1);
        const settingsMap = {
          'action': 'action',
          'checkpermissions': 'checkPermissions',
          'verifiedbots': 'allowVerified'
        };
        for (let i = 0; i < args.length - 1; i += 2) {
          const key = args[i].toLowerCase();
          const value = args[i + 1];
          if (settingsMap[key]) {
            if (key === 'action') {
              antibotConfig[settingsMap[key]] = value;
            } else {
              antibotConfig[settingsMap[key]] = value.toLowerCase() === 'true' || value === '1';
            }
          }
        }
      }

      const defaults = config.security.antibot;
      antibotConfig = {
        action: antibotConfig.action || defaults.action,
        checkPermissions: antibotConfig.checkPermissions !== undefined ? antibotConfig.checkPermissions : true,
        allowVerified: antibotConfig.allowVerified !== undefined ? antibotConfig.allowVerified : true
      };

      await updateGuild(guild.id, { antibot_config: JSON.stringify(antibotConfig) });

      const embed = successEmbed(
        'Antibot Configuration Updated',
        `**Action:** ${antibotConfig.action}\n` +
        `**Check Permissions:** ${antibotConfig.checkPermissions ? '✅ Yes' : '❌ No'}\n` +
        `**Allow Verified:** ${antibotConfig.allowVerified ? '✅ Yes' : '❌ No'}`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to update antibot configuration.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};

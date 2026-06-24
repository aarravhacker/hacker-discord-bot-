const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../../utils/helpers');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukeconfig')
    .setDescription('Configure antinuke settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('maxchanneldelete').setDescription('Max channel deletes before action').setMinValue(1).setMaxValue(50)
    )
    .addIntegerOption(opt =>
      opt.setName('maxchannelcreate').setDescription('Max channel creates before action').setMinValue(1).setMaxValue(50)
    )
    .addIntegerOption(opt =>
      opt.setName('maxroledelete').setDescription('Max role deletes before action').setMinValue(1).setMaxValue(50)
    )
    .addIntegerOption(opt =>
      opt.setName('maxrolecreate').setDescription('Max role creates before action').setMinValue(1).setMaxValue(50)
    )
    .addIntegerOption(opt =>
      opt.setName('maxmemberban').setDescription('Max member bans before action').setMinValue(1).setMaxValue(50)
    )
    .addIntegerOption(opt =>
      opt.setName('maxmemberkick').setDescription('Max member kicks before action').setMinValue(1).setMaxValue(50)
    )
    .addIntegerOption(opt =>
      opt.setName('timewindow').setDescription('Time window in seconds').setMinValue(10).setMaxValue(300)
    ),
  cooldown: 5,
  aliases: ['anconfig', 'antinukecfg'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const user = isSlash ? interaction.user : interaction.author;

    try {
      const guildData = await getGuild(guild.id);
      let antinukeConfig = JSON.parse(guildData.antinuke_config || '{}');

      if (isSlash) {
        const maxChannelDelete = interaction.options?.getInteger('maxchanneldelete');
        const maxChannelCreate = interaction.options?.getInteger('maxchannelcreate');
        const maxRoleDelete = interaction.options?.getInteger('maxroledelete');
        const maxRoleCreate = interaction.options?.getInteger('maxrolecreate');
        const maxMemberBan = interaction.options?.getInteger('maxmemberban');
        const maxMemberKick = interaction.options?.getInteger('maxmemberkick');
        const timeWindow = interaction.options?.getInteger('timewindow');

        if (maxChannelDelete) antinukeConfig.maxChannelDelete = maxChannelDelete;
        if (maxChannelCreate) antinukeConfig.maxChannelCreate = maxChannelCreate;
        if (maxRoleDelete) antinukeConfig.maxRoleDelete = maxRoleDelete;
        if (maxRoleCreate) antinukeConfig.maxRoleCreate = maxRoleCreate;
        if (maxMemberBan) antinukeConfig.maxMemberBan = maxMemberBan;
        if (maxMemberKick) antinukeConfig.maxMemberKick = maxMemberKick;
        if (timeWindow) antinukeConfig.timeWindow = timeWindow * 1000;
      } else {
        const args = interaction.content.split(' ').slice(1);
        const settingsMap = {
          'maxchanneldelete': 'maxChannelDelete',
          'maxchannelcreate': 'maxChannelCreate',
          'maxroledelete': 'maxRoleDelete',
          'maxrolecreate': 'maxRoleCreate',
          'maxmemberban': 'maxMemberBan',
          'maxmemberkick': 'maxMemberKick',
          'timewindow': 'timeWindow'
        };
        for (let i = 0; i < args.length - 1; i += 2) {
          const key = args[i].toLowerCase();
          const value = parseInt(args[i + 1]);
          if (settingsMap[key] && !isNaN(value)) {
            antinukeConfig[settingsMap[key]] = key === 'timewindow' ? value * 1000 : value;
          }
        }
      }

      const defaults = config.security.antinuke;
      antinukeConfig = {
        maxChannelDelete: antinukeConfig.maxChannelDelete || defaults.maxChannelDelete,
        maxChannelCreate: antinukeConfig.maxChannelCreate || defaults.maxChannelCreate,
        maxRoleDelete: antinukeConfig.maxRoleDelete || defaults.maxRoleDelete,
        maxRoleCreate: antinukeConfig.maxRoleCreate || defaults.maxRoleCreate,
        maxMemberBan: antinukeConfig.maxMemberBan || defaults.maxMemberBan,
        maxMemberKick: antinukeConfig.maxMemberKick || defaults.maxMemberKick,
        timeWindow: antinukeConfig.timeWindow || defaults.timeWindow
      };

      await updateGuild(guild.id, { antinuke_config: JSON.stringify(antinukeConfig) });

      const embed = successEmbed(
        'Antinuke Configuration Updated',
        `**Max Channel Delete:** ${antinukeConfig.maxChannelDelete}\n` +
        `**Max Channel Create:** ${antinukeConfig.maxChannelCreate}\n` +
        `**Max Role Delete:** ${antinukeConfig.maxRoleDelete}\n` +
        `**Max Role Create:** ${antinukeConfig.maxRoleCreate}\n` +
        `**Max Member Ban:** ${antinukeConfig.maxMemberBan}\n` +
        `**Max Member Kick:** ${antinukeConfig.maxMemberKick}\n` +
        `**Time Window:** ${antinukeConfig.timeWindow / 1000}s`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to update antinuke configuration.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};

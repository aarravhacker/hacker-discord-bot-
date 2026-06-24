const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { addSecurityLog } = require('../../../db/securityRepository');
const logger = require('../../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukenuke')
    .setDescription('Nuclear protection - ultimate server defense')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('arm').setDescription('Arm nuclear protection (auto-punish all destructive actions)'))
    .addSubcommand(sub =>
      sub.setName('disarm').setDescription('Disarm nuclear protection'))
    .addSubcommand(sub =>
      sub.setName('status').setDescription('View nuclear protection status'))
    .addSubcommand(sub =>
      sub.setName('log').setDescription('View nuclear event log'))
    .addSubcommand(sub =>
      sub.setName('config')
        .setDescription('Configure nuclear protection')
        .addStringOption(opt => opt.setName('punishment').setDescription('Punishment type').addChoices(
          { name: 'ban', value: 'ban' }, { name: 'kick', value: 'kick' }, { name: 'timeout', value: 'timeout' }, { name: 'strip+timeout', value: 'strip' }))
        .addIntegerOption(opt => opt.setName('threshold').setDescription('Actions before nuclear response (1-10)').setMinValue(1).setMaxValue(10))
        .addIntegerOption(opt => opt.setName('window').setDescription('Time window in seconds (5-60)').setMinValue(5).setMaxValue(60))),

  cooldown: 5,
  aliases: ['anuke', 'nuclear'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permission.', ephemeral: true });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'status').toLowerCase();
    const guildData = await getGuild(interaction.guild.id);

    if (subcommand === 'arm') {
      const config = JSON.parse(guildData.antinuke_config || '{}');
      config.nuclearMode = true;
      config.nuclearPunishment = config.nuclearPunishment || 'ban';
      config.nuclearThreshold = config.nuclearThreshold || 2;
      config.nuclearWindow = config.nuclearWindow || 30;
      await updateGuild(interaction.guild.id, { antinuke_config: JSON.stringify(config) });
      securityEngine.setStage(interaction.guild.id, 4, 'Nuclear protection armed');
      await addSecurityLog({ guild_id: interaction.guild.id, user_id: user.id, action: 'nuclear_armed', type: 'antinuke', details: JSON.stringify({ punishment: config.nuclearPunishment, threshold: config.nuclearThreshold }) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setTitle('NUCLEAR PROTECTION ARMED').setDescription(`Any **${config.nuclearThreshold}** destructive actions in **${config.nuclearWindow}s** will result in automatic **${config.nuclearPunishment}**.\n\nServer is now in **Lockdown** stage.`).setTimestamp()] });
    }

    if (subcommand === 'disarm') {
      const config = JSON.parse(guildData.antinuke_config || '{}');
      config.nuclearMode = false;
      await updateGuild(interaction.guild.id, { antinuke_config: JSON.stringify(config) });
      securityEngine.setStage(interaction.guild.id, 0, 'Nuclear protection disarmed');
      await addSecurityLog({ guild_id: interaction.guild.id, user_id: user.id, action: 'nuclear_disarmed', type: 'antinuke', details: '{}' });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setTitle('NUCLEAR PROTECTION DISARMED').setDescription('Server returned to Normal stage.').setTimestamp()] });
    }

    if (subcommand === 'status') {
      const config = JSON.parse(guildData.antinuke_config || '{}');
      const armed = config.nuclearMode || false;
      const stage = securityEngine.getStage(interaction.guild.id);
      const incidents = securityEngine.getIncidents(interaction.guild.id, 100);
      const nuclearIncidents = incidents.filter(i => i.type?.includes('nuclear') || i.type?.includes('punish'));

      return interaction.reply({ embeds: [new EmbedBuilder()
        .setColor(armed ? 0xff0000 : 0x00ff00)
        .setTitle('Nuclear Protection Status')
        .setDescription(armed ? '**ARMED** - Destructive actions will be auto-punished' : 'Disarmed')
        .addFields(
          { name: 'Stage', value: stage.name, inline: true },
          { name: 'Punishment', value: config.nuclearPunishment || 'ban', inline: true },
          { name: 'Threshold', value: `${config.nuclearThreshold || 2} actions`, inline: true },
          { name: 'Window', value: `${config.nuclearWindow || 30}s`, inline: true },
          { name: 'Triggered', value: `${nuclearIncidents.length} times`, inline: true }
        )
        .setTimestamp()
      ] });
    }

    if (subcommand === 'log') {
      const incidents = securityEngine.getIncidents(interaction.guild.id, 200);
      const nuclear = incidents.filter(i => i.type?.includes('nuclear') || i.type?.includes('punish') || i.type?.includes('auto_'));

      const embed = new EmbedBuilder()
        .setColor(nuclear.length > 0 ? 0xff0000 : 0x00ff00)
        .setTitle('Nuclear Event Log')
        .setDescription(nuclear.length > 0 ? 'Recent nuclear events:' : 'No nuclear events logged.')
        .setTimestamp();

      if (nuclear.length > 0) {
        const list = nuclear.slice(0, 10).map(n => `\`${new Date(n.timestamp).toLocaleString()}\` **${n.type}** by <@${n.userId}>`).join('\n');
        embed.addFields({ name: 'Events', value: list.substring(0, 1024) });
      }

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'config') {
      const config = JSON.parse(guildData.antinuke_config || '{}');
      const punishment = isSlash ? interaction.options.getString('punishment') : args[0];
      const threshold = isSlash ? interaction.options.getInteger('threshold') : parseInt(args[1]) || null;
      const window = isSlash ? interaction.options.getInteger('window') : parseInt(args[2]) || null;

      if (punishment) config.nuclearPunishment = punishment;
      if (threshold) config.nuclearThreshold = threshold;
      if (window) config.nuclearWindow = window;

      await updateGuild(interaction.guild.id, { antinuke_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Nuclear config updated: **${config.nuclearPunishment}** | **${config.nuclearThreshold || 2}** actions in **${config.nuclearWindow || 30}s**`)] });
    }
  }
};

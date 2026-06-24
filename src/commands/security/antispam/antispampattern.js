const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { addSecurityLog } = require('../../../db/securityRepository');
const logger = require('../../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antispampattern')
    .setDescription('Configure spam detection patterns')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Show current spam pattern settings'))
    .addSubcommand(sub =>
      sub.setName('duplicate')
        .setDescription('Configure duplicate message detection')
        .addIntegerOption(opt => opt.setName('count').setDescription('Messages before action (2-20)').setMinValue(2).setMaxValue(20))
        .addIntegerOption(opt => opt.setName('window').setDescription('Time window in seconds (1-60)').setMinValue(1).setMaxValue(60)))
    .addSubcommand(sub =>
      sub.setName('mention')
        .setDescription('Configure mass mention detection')
        .addIntegerOption(opt => opt.setName('count').setDescription('Mentions before action (3-50)').setMinValue(3).setMaxValue(50)))
    .addSubcommand(sub =>
      sub.setName('flood')
        .setDescription('Configure message flood detection')
        .addIntegerOption(opt => opt.setName('count').setDescription('Messages before action (5-50)').setMinValue(5).setMaxValue(50))
        .addIntegerOption(opt => opt.setName('window').setDescription('Time window in seconds (1-30)').setMinValue(1).setMaxValue(30)))
    .addSubcommand(sub =>
      sub.setName('emoji')
        .setDescription('Configure emoji spam detection')
        .addIntegerOption(opt => opt.setName('count').setDescription('Emojis before action (5-100)').setMinValue(5).setMaxValue(100)))
    .addSubcommand(sub =>
      sub.setName('caps')
        .setDescription('Configure caps lock detection')
        .addIntegerOption(opt => opt.setName('percent').setDescription('Minimum caps percentage (60-100)').setMinValue(60).setMaxValue(100))
        .addIntegerOption(opt => opt.setName('length').setDescription('Minimum message length (10-200)').setMinValue(10).setMaxValue(200)))
    .addSubcommand(sub =>
      sub.setName('link')
        .setDescription('Configure link spam detection')
        .addIntegerOption(opt => opt.setName('count').setDescription('Links before action (2-20)').setMinValue(2).setMaxValue(20)))
    .addSubcommand(sub =>
      sub.setName('reset').setDescription('Reset all pattern settings to defaults')),

  cooldown: 5,
  aliases: ['aspattern', 'spampattern'],
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
    const config = JSON.parse(guildData.antispam_config || '{}');

    if (!config.patterns) {
      config.patterns = {
        duplicateCount: 3,
        duplicateWindow: 10,
        mentionCount: 5,
        floodCount: 8,
        floodWindow: 5,
        emojiCount: 10,
        capsPercent: 70,
        capsMinLength: 20,
        linkCount: 3
      };
    }

    if (subcommand === 'status') {
      const p = config.patterns;
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Spam Pattern Settings')
        .addFields(
          { name: 'Duplicate Messages', value: `${p.duplicateCount} same messages in ${p.duplicateWindow}s`, inline: true },
          { name: 'Mass Mentions', value: `${p.mentionCount}+ mentions per message`, inline: true },
          { name: 'Message Flood', value: `${p.floodCount} messages in ${p.floodWindow}s`, inline: true },
          { name: 'Emoji Spam', value: `${p.emojiCount}+ emojis per message`, inline: true },
          { name: 'Caps Lock', value: `${p.capsPercent}%+ caps (min ${p.capsMinLength} chars)`, inline: true },
          { name: 'Link Spam', value: `${p.linkCount}+ links per message`, inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'duplicate') {
      const count = isSlash ? interaction.options.getInteger('count') : parseInt(args[0]);
      const window = isSlash ? interaction.options.getInteger('window') : parseInt(args[1]);
      if (count) config.patterns.duplicateCount = count;
      if (window) config.patterns.duplicateWindow = window;
    } else if (subcommand === 'mention') {
      const count = isSlash ? interaction.options.getInteger('count') : parseInt(args[0]);
      if (count) config.patterns.mentionCount = count;
    } else if (subcommand === 'flood') {
      const count = isSlash ? interaction.options.getInteger('count') : parseInt(args[0]);
      const window = isSlash ? interaction.options.getInteger('window') : parseInt(args[1]);
      if (count) config.patterns.floodCount = count;
      if (window) config.patterns.floodWindow = window;
    } else if (subcommand === 'emoji') {
      const count = isSlash ? interaction.options.getInteger('count') : parseInt(args[0]);
      if (count) config.patterns.emojiCount = count;
    } else if (subcommand === 'caps') {
      const percent = isSlash ? interaction.options.getInteger('percent') : parseInt(args[0]);
      const length = isSlash ? interaction.options.getInteger('length') : parseInt(args[1]);
      if (percent) config.patterns.capsPercent = percent;
      if (length) config.patterns.capsMinLength = length;
    } else if (subcommand === 'link') {
      const count = isSlash ? interaction.options.getInteger('count') : parseInt(args[0]);
      if (count) config.patterns.linkCount = count;
    } else if (subcommand === 'reset') {
      config.patterns = {
        duplicateCount: 3,
        duplicateWindow: 10,
        mentionCount: 5,
        floodCount: 8,
        floodWindow: 5,
        emojiCount: 10,
        capsPercent: 70,
        capsMinLength: 20,
        linkCount: 3
      };
    }

    await updateGuild(interaction.guild.id, { antispam_config: JSON.stringify(config) });
    await addSecurityLog({ guild_id: interaction.guild.id, user_id: user.id, action: 'pattern_config_updated', type: 'antispam', details: JSON.stringify(config.patterns) });

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Spam pattern settings updated.`).setTimestamp()] });
  }
};

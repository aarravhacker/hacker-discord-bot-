const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukethreshold')
    .setDescription('Set action thresholds')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('channel').setDescription('Set channel deletion threshold')
      .addIntegerOption(opt => opt.setName('count').setDescription('Number of channels').setRequired(true))
      .addIntegerOption(opt => opt.setName('seconds').setDescription('Time window in seconds').setRequired(true)))
    .addSubcommand(sub => sub.setName('role').setDescription('Set role modification threshold')
      .addIntegerOption(opt => opt.setName('count').setDescription('Number of roles').setRequired(true))
      .addIntegerOption(opt => opt.setName('seconds').setDescription('Time window in seconds').setRequired(true)))
    .addSubcommand(sub => sub.setName('member').setDescription('Set member kick/ban threshold')
      .addIntegerOption(opt => opt.setName('count').setDescription('Number of members').setRequired(true))
      .addIntegerOption(opt => opt.setName('seconds').setDescription('Time window in seconds').setRequired(true)))
    .addSubcommand(sub => sub.setName('view').setDescription('View all current thresholds')),

  cooldown: 5,
  aliases: ['anthreshold', 'athreshold'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Permission Denied')
        .setDescription('You need Administrator permission to use this command.')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'view');
    const validSubs = ['channel', 'role', 'member', 'view'];
    if (!validSubs.includes(subcommand)) {
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle('⚠️ Invalid Subcommand')
        .setDescription(`Valid subcommands: ${validSubs.join(', ')}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      if (subcommand === 'view') {
        const thresholds = await securityEngine.getThresholds(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('⚡ Antinuke Thresholds')
          .setDescription('Current action thresholds for this server.')
          .addFields(
            { name: 'Channel Deletion', value: `${thresholds?.channel?.count || 3} channels in ${thresholds?.channel?.seconds || 60}s`, inline: true },
            { name: 'Role Modification', value: `${thresholds?.role?.count || 3} roles in ${thresholds?.role?.seconds || 60}s`, inline: true },
            { name: 'Member Actions', value: `${thresholds?.member?.count || 5} members in ${thresholds?.member?.seconds || 60}s`, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      let count, seconds;
      if (isSlash) {
        count = interaction.options.getInteger('count');
        seconds = interaction.options.getInteger('seconds');
      } else {
        count = parseInt(args[1]);
        seconds = parseInt(args[2]);
      }

      if (!count || !seconds || isNaN(count) || isNaN(seconds)) {
        const embed = new EmbedBuilder()
          .setColor(0xff9900)
          .setTitle('⚠️ Invalid Parameters')
          .setDescription('Please provide valid count and seconds values.')
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      await securityEngine.setThreshold(interaction.guild.id, subcommand, count, seconds);
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('⚡ Threshold Updated')
        .setDescription(`${subcommand.charAt(0).toUpperCase() + subcommand.slice(1)} threshold has been updated.`)
        .addFields(
          { name: 'Type', value: subcommand.charAt(0).toUpperCase() + subcommand.slice(1), inline: true },
          { name: 'Count', value: String(count), inline: true },
          { name: 'Time Window', value: `${seconds}s`, inline: true },
          { name: 'Updated By', value: user.tag, inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Error')
        .setDescription(`Threshold operation failed: ${error.message}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};

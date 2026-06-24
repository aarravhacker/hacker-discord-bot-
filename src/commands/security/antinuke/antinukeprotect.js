const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukeprotect')
    .setDescription('Quick protect/unprotect the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable antinuke protection'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable antinuke protection'))
    .addSubcommand(sub => sub.setName('status').setDescription('Check protection status')),

  cooldown: 5,
  aliases: ['anprotect', 'aprotect'],
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

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'status');
    const validSubs = ['enable', 'disable', 'status'];
    if (!validSubs.includes(subcommand)) {
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle('⚠️ Invalid Subcommand')
        .setDescription(`Valid subcommands: ${validSubs.join(', ')}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      if (subcommand === 'enable') {
        await securityEngine.setProtection(interaction.guild.id, 'master', true);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('🛡️ Antinuke Protection Enabled')
          .setDescription('Antinuke protection is now **ACTIVE**. The server is protected against nuke attacks.')
          .addFields(
            { name: 'Status', value: '🟢 Active', inline: true },
            { name: 'Enabled By', value: user.tag, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'disable') {
        await securityEngine.setProtection(interaction.guild.id, 'master', false);
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('🛡️ Antinuke Protection Disabled')
          .setDescription('Antinuke protection is now **INACTIVE**. The server is **NOT** protected against nuke attacks.')
          .addFields(
            { name: 'Status', value: '🔴 Inactive', inline: true },
            { name: 'Disabled By', value: user.tag, inline: true },
            { name: '⚠️ Warning', value: 'Server is vulnerable!', inline: false }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'status') {
        const protectStatus = await securityEngine.getProtectionStatus(interaction.guild.id);
        const isActive = protectStatus?.active;
        const embed = new EmbedBuilder()
          .setColor(isActive ? 0x00ff00 : 0xff0000)
          .setTitle('🛡️ Antinuke Protection Status')
          .setDescription(`Protection status for **${interaction.guild.name}**`)
          .addFields(
            { name: 'Status', value: isActive ? '🟢 Active' : '🔴 Inactive', inline: true },
            { name: 'Mode', value: protectStatus?.mode || 'Not set', inline: true },
            { name: 'Uptime', value: protectStatus?.uptime || 'N/A', inline: true },
            { name: 'Last Incident', value: protectStatus?.lastIncident || 'None', inline: true },
            { name: 'Threats Blocked', value: String(protectStatus?.threatsBlocked || 0), inline: true }
          )
          .setTimestamp();

        if (protectStatus?.protections) {
          const p = protectStatus.protections;
          embed.addFields(
            { name: 'Channel Protection', value: p.channels ? '✅' : '❌', inline: true },
            { name: 'Role Protection', value: p.roles ? '✅' : '❌', inline: true },
            { name: 'Member Protection', value: p.members ? '✅' : '❌', inline: true }
          );
        }

        return interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Error')
        .setDescription(`Protection operation failed: ${error.message}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};

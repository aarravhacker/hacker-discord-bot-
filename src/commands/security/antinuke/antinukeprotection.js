const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukeprotection')
    .setDescription('Toggle specific protections')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('channels').setDescription('Toggle channel protection')
      .addStringOption(opt => opt.setName('action').setDescription('Enable or disable').setRequired(true)
        .addChoices({ name: 'Enable', value: 'enable' }, { name: 'Disable', value: 'disable' })))
    .addSubcommand(sub => sub.setName('roles').setDescription('Toggle role protection')
      .addStringOption(opt => opt.setName('action').setDescription('Enable or disable').setRequired(true)
        .addChoices({ name: 'Enable', value: 'enable' }, { name: 'Disable', value: 'disable' })))
    .addSubcommand(sub => sub.setName('members').setDescription('Toggle member protection')
      .addStringOption(opt => opt.setName('action').setDescription('Enable or disable').setRequired(true)
        .addChoices({ name: 'Enable', value: 'enable' }, { name: 'Disable', value: 'disable' })))
    .addSubcommand(sub => sub.setName('permissions').setDescription('Toggle permission protection')
      .addStringOption(opt => opt.setName('action').setDescription('Enable or disable').setRequired(true)
        .addChoices({ name: 'Enable', value: 'enable' }, { name: 'Disable', value: 'disable' })))
    .addSubcommand(sub => sub.setName('view').setDescription('View all protection settings')),

  cooldown: 5,
  aliases: ['anprotection', 'aprotection'],
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
    const validSubs = ['channels', 'roles', 'members', 'permissions', 'view'];
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
        const protections = await securityEngine.getProtections(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('🛡️ Protection Settings')
          .setDescription('Current antinuke protection toggles.')
          .addFields(
            { name: 'Channel Protection', value: protections?.channels ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Role Protection', value: protections?.roles ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Member Protection', value: protections?.members ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Permission Protection', value: protections?.permissions ? '✅ Enabled' : '❌ Disabled', inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const action = isSlash ? interaction.options.getString('action') : args[1];
      if (!action || !['enable', 'disable'].includes(action)) {
        const embed = new EmbedBuilder()
          .setColor(0xff9900)
          .setTitle('⚠️ Invalid Action')
          .setDescription('Please specify "enable" or "disable".')
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const enabled = action === 'enable';
      await securityEngine.setProtection(interaction.guild.id, subcommand, enabled);

      const typeNames = { channels: 'Channel', roles: 'Role', members: 'Member', permissions: 'Permission' };
      const embed = new EmbedBuilder()
        .setColor(enabled ? 0x00ff00 : 0xff9900)
        .setTitle(`🛡️ ${typeNames[subcommand]} Protection ${enabled ? 'Enabled' : 'Disabled'}`)
        .setDescription(`${typeNames[subcommand]} protection has been ${enabled ? 'enabled' : 'disabled'}.`)
        .addFields(
          { name: 'Protection', value: typeNames[subcommand], inline: true },
          { name: 'Status', value: enabled ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Changed By', value: user.tag, inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
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

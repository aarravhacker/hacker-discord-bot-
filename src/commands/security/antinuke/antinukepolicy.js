const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukepolicy')
    .setDescription('Set antinuke policy')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('set').setDescription('Set a new policy')
      .addStringOption(opt => opt.setName('policy').setDescription('Policy name').setRequired(true)
        .addChoices(
          { name: 'Auto-Delete', value: 'autodelete' },
          { name: 'Auto-Role', value: 'autorole' },
          { name: 'Auto-Channel', value: 'autochannel' },
          { name: 'Auto-Ban', value: 'autoban' },
          { name: 'Auto-Kick', value: 'autokick' }
        ))
      .addStringOption(opt => opt.setName('value').setDescription('Policy value').setRequired(true)))
    .addSubcommand(sub => sub.setName('view').setDescription('View current policies'))
    .addSubcommand(sub => sub.setName('reset').setDescription('Reset all policies to defaults')),

  cooldown: 5,
  aliases: ['anpolicy', 'apolicy'],
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
    const validSubs = ['set', 'view', 'reset'];
    if (!validSubs.includes(subcommand)) {
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle('⚠️ Invalid Subcommand')
        .setDescription(`Valid subcommands: ${validSubs.join(', ')}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      if (subcommand === 'set') {
        const policy = isSlash ? interaction.options.getString('policy') : args[1];
        const value = isSlash ? interaction.options.getString('value') : args[2];
        if (!policy || !value) {
          const embed = new EmbedBuilder()
            .setColor(0xff9900)
            .setTitle('⚠️ Missing Parameters')
            .setDescription('Please provide both policy name and value.')
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }
        await securityEngine.setPolicy(interaction.guild.id, policy, value);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('📋 Policy Updated')
          .setDescription(`Policy \`${policy}\` has been set to \`${value}\`.`)
          .addFields(
            { name: 'Policy', value: policy, inline: true },
            { name: 'Value', value: value, inline: true },
            { name: 'Updated By', value: user.tag, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'view') {
        const policies = await securityEngine.getPolicies(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('📋 Antinuke Policies')
          .setDescription('Current antinuke policies for this server.')
          .setTimestamp();
        if (policies && typeof policies === 'object') {
          for (const [key, val] of Object.entries(policies)) {
            embed.addFields({ name: key, value: String(val), inline: true });
          }
        } else {
          embed.setDescription('No policies configured. Using defaults.');
        }
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'reset') {
        await securityEngine.resetPolicies(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('📋 Policies Reset')
          .setDescription('All antinuke policies have been reset to defaults.')
          .addFields({ name: 'Reset By', value: user.tag, inline: true })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Error')
        .setDescription(`Policy operation failed: ${error.message}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};

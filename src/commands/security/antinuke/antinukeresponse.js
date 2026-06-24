const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukeresponse')
    .setDescription('Configure response actions')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('set').setDescription('Set response action')
      .addStringOption(opt => opt.setName('trigger').setDescription('What triggers this response').setRequired(true)
        .addChoices(
          { name: 'Channel Delete', value: 'channel_delete' },
          { name: 'Role Delete', value: 'role_delete' },
          { name: 'Role Create', value: 'role_create' },
          { name: 'Mass Kick', value: 'mass_kick' },
          { name: 'Permission Change', value: 'permission_change' }
        ))
      .addStringOption(opt => opt.setName('action').setDescription('Response action').setRequired(true)
        .addChoices(
          { name: 'Ban Attacker', value: 'ban' },
          { name: 'Kick Attacker', value: 'kick' },
          { name: 'Timeout Attacker', value: 'timeout' },
          { name: 'Lockdown Server', value: 'lockdown' },
          { name: 'Rollback Changes', value: 'rollback' },
          { name: 'Notify Admins', value: 'notify' }
        )))
    .addSubcommand(sub => sub.setName('view').setDescription('View all response actions'))
    .addSubcommand(sub => sub.setName('test').setDescription('Test a response action')
      .addStringOption(opt => opt.setName('trigger').setDescription('Trigger to test').setRequired(true)
        .addChoices(
          { name: 'Channel Delete', value: 'channel_delete' },
          { name: 'Role Delete', value: 'role_delete' },
          { name: 'Role Create', value: 'role_create' },
          { name: 'Mass Kick', value: 'mass_kick' },
          { name: 'Permission Change', value: 'permission_change' }
        ))),

  cooldown: 10,
  aliases: ['anresponse', 'aresponse'],
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
    const validSubs = ['set', 'view', 'test'];
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
        const responses = await securityEngine.getResponseActions(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('🎯 Response Actions')
          .setDescription('Current response actions for this server.')
          .setTimestamp();

        if (responses?.length) {
          responses.forEach(r => {
            embed.addFields({
              name: r.trigger,
              value: `Action: ${r.action}\nCooldown: ${r.cooldown || 'N/A'}`,
              inline: true
            });
          });
        } else {
          embed.addFields({ name: 'Response Actions', value: 'No custom response actions configured. Using defaults.' });
        }

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'set') {
        const trigger = isSlash ? interaction.options.getString('trigger') : args[1];
        const action = isSlash ? interaction.options.getString('action') : args[2];
        if (!trigger || !action) {
          const embed = new EmbedBuilder()
            .setColor(0xff9900)
            .setTitle('⚠️ Missing Parameters')
            .setDescription('Please provide both trigger and action.')
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        await securityEngine.setResponseAction(interaction.guild.id, trigger, action);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('🎯 Response Action Set')
          .setDescription(`Response action has been configured.`)
          .addFields(
            { name: 'Trigger', value: trigger, inline: true },
            { name: 'Action', value: action, inline: true },
            { name: 'Set By', value: user.tag, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'test') {
        const trigger = isSlash ? interaction.options.getString('trigger') : args[1];
        if (!trigger) {
          const embed = new EmbedBuilder()
            .setColor(0xff9900)
            .setTitle('⚠️ Missing Trigger')
            .setDescription('Please specify a trigger to test.')
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        await interaction.deferReply();
        const result = await securityEngine.testResponse(interaction.guild.id, trigger);
        const embed = new EmbedBuilder()
          .setColor(0xffaa00)
          .setTitle(`🧪 Response Test - ${trigger}`)
          .setDescription(`Testing response for **${trigger}** (simulation only).`)
          .addFields(
            { name: 'Trigger', value: trigger, inline: true },
            { name: 'Action', value: result?.action || 'N/A', inline: true },
            { name: 'Would Execute', value: result?.wouldExecute ? 'Yes' : 'No', inline: true },
            { name: '⚠️ Note', value: 'This is a test only. No actions were taken.' }
          )
          .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Error')
        .setDescription(`Response operation failed: ${error.message}`)
        .setTimestamp();
      if (interaction.deferred) {
        return interaction.editReply({ embeds: [embed] });
      }
      return interaction.reply({ embeds: [embed] });
    }
  }
};

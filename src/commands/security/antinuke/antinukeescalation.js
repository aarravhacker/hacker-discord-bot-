const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukeescalation')
    .setDescription('Configure escalation levels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('set').setDescription('Set escalation level')
      .addStringOption(opt => opt.setName('level').setDescription('Escalation level').setRequired(true)
        .addChoices(
          { name: 'Level 1 - Warning', value: 'warning' },
          { name: 'Level 2 - Timeout', value: 'timeout' },
          { name: 'Level 3 - Kick', value: 'kick' },
          { name: 'Level 4 - Ban', value: 'ban' },
          { name: 'Level 5 - Lockdown', value: 'lockdown' }
        ))
      .addStringOption(opt => opt.setName('trigger').setDescription('What triggers this escalation').setRequired(true)))
    .addSubcommand(sub => sub.setName('view').setDescription('View escalation configuration'))
    .addSubcommand(sub => sub.setName('test').setDescription('Test an escalation level')
      .addStringOption(opt => opt.setName('level').setDescription('Level to test').setRequired(true)
        .addChoices(
          { name: 'Level 1', value: '1' },
          { name: 'Level 2', value: '2' },
          { name: 'Level 3', value: '3' },
          { name: 'Level 4', value: '4' },
          { name: 'Level 5', value: '5' }
        ))),

  cooldown: 10,
  aliases: ['anescalation', 'aescalation'],
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
        const config = await securityEngine.getEscalationConfig(interaction.guild.id);
        const levels = config?.levels || [];

        const embed = new EmbedBuilder()
          .setColor(0xffaa00)
          .setTitle('📈 Escalation Configuration')
          .setDescription('Current escalation levels for this server.')
          .setTimestamp();

        if (levels.length > 0) {
          levels.forEach((level, i) => {
            embed.addFields({
              name: `Level ${i + 1} - ${level.action}`,
              value: `Trigger: ${level.trigger}\nCooldown: ${level.cooldown || 'N/A'}`,
              inline: true
            });
          });
        } else {
          embed.addFields({ name: 'Escalation Levels', value: 'No escalation levels configured. Using defaults.' });
        }

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'set') {
        const level = isSlash ? interaction.options.getString('level') : args[1];
        const trigger = isSlash ? interaction.options.getString('trigger') : args.slice(2).join(' ');
        if (!level || !trigger) {
          const embed = new EmbedBuilder()
            .setColor(0xff9900)
            .setTitle('⚠️ Missing Parameters')
            .setDescription('Please provide both level and trigger.')
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        await securityEngine.setEscalationLevel(interaction.guild.id, level, trigger);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('📈 Escalation Level Set')
          .setDescription(`Escalation level has been configured.`)
          .addFields(
            { name: 'Level', value: level, inline: true },
            { name: 'Trigger', value: trigger, inline: true },
            { name: 'Set By', value: user.tag, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'test') {
        const level = isSlash ? interaction.options.getString('level') : args[1];
        if (!level) {
          const embed = new EmbedBuilder()
            .setColor(0xff9900)
            .setTitle('⚠️ Missing Level')
            .setDescription('Please specify a level to test.')
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        await interaction.deferReply();
        const result = await securityEngine.testEscalation(interaction.guild.id, level);
        const embed = new EmbedBuilder()
          .setColor(0xffaa00)
          .setTitle(`🧪 Escalation Test - Level ${level}`)
          .setDescription(`Testing escalation level ${level} (simulation only).`)
          .addFields(
            { name: 'Level', value: level, inline: true },
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
        .setDescription(`Escalation operation failed: ${error.message}`)
        .setTimestamp();
      if (interaction.deferred) {
        return interaction.editReply({ embeds: [embed] });
      }
      return interaction.reply({ embeds: [embed] });
    }
  }
};

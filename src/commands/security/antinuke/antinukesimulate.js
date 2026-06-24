const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukesimulate')
    .setDescription('Simulate an attack for testing')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Type of attack to simulate')
        .setRequired(true)
        .addChoices(
          { name: 'Channel Mass Delete', value: 'channel_delete' },
          { name: 'Role Mass Delete', value: 'role_delete' },
          { name: 'Role Mass Create', value: 'role_create' },
          { name: 'Permission Escalation', value: 'permission_escalation' },
          { name: 'Bot Kick', value: 'bot_kick' },
          { name: 'Webhook Create', value: 'webhook_create' }
        )
    )
    .addIntegerOption(opt => opt.setName('intensity').setDescription('Simulation intensity (1-10)').setMinValue(1).setMaxValue(10)),

  cooldown: 30,
  aliases: ['ansimulate', 'asimulate'],
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

    const type = isSlash ? interaction.options.getString('type') : args[0];
    const intensity = isSlash ? (interaction.options.getInteger('intensity') || 5) : (parseInt(args[1]) || 5);

    if (!type) {
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle('⚠️ Missing Attack Type')
        .setDescription('Please specify the type of attack to simulate.')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      await interaction.deferReply();
      const result = await securityEngine.simulateAttack(interaction.guild.id, type, intensity);

      const typeNames = {
        channel_delete: 'Channel Mass Delete',
        role_delete: 'Role Mass Delete',
        role_create: 'Role Mass Create',
        permission_escalation: 'Permission Escalation',
        bot_kick: 'Bot Kick',
        webhook_create: 'Webhook Create'
      };

      const embed = new EmbedBuilder()
        .setColor(0xffaa00)
        .setTitle('🧪 Attack Simulation Complete')
        .setDescription(`Simulated **${typeNames[type]}** attack at intensity **${intensity}/10**`)
        .addFields(
          { name: 'Attack Type', value: typeNames[type] || type, inline: true },
          { name: 'Intensity', value: `${intensity}/10`, inline: true },
          { name: 'Detected', value: result?.detected ? '✅ Yes' : '❌ No', inline: true },
          { name: 'Response Time', value: result?.responseTime || 'N/A', inline: true },
          { name: 'Actions Taken', value: String(result?.actionsTaken || 0), inline: true },
          { name: 'Rollback Attempted', value: result?.rollbackAttempted ? 'Yes' : 'No', inline: true }
        )
        .setTimestamp();

      if (result?.details?.length) {
        const details = result.details.map(d => `• ${d}`).join('\n');
        embed.addFields({ name: 'Simulation Details', value: details });
      }

      if (result?.recommendations?.length) {
        const recs = result.recommendations.slice(0, 3).map(r => `• ${r}`).join('\n');
        embed.addFields({ name: 'Recommendations', value: recs });
      }

      embed.addFields(
        { name: '⚠️ Warning', value: 'This was a simulation only. No real changes were made to the server.' },
        { name: 'Run By', value: user.tag, inline: true }
      );

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Simulation Error')
        .setDescription(`Simulation failed: ${error.message}`)
        .setTimestamp();
      if (interaction.deferred) {
        return interaction.editReply({ embeds: [embed] });
      }
      return interaction.reply({ embeds: [embed] });
    }
  }
};

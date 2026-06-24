const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukeguardian')
    .setDescription('Guardian angel mode - auto-respond to threats')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('action')
        .setDescription('Action to perform')
        .setRequired(false)
        .addChoices(
          { name: 'Enable', value: 'enable' },
          { name: 'Disable', value: 'disable' },
          { name: 'Status', value: 'status' },
          { name: 'Configure', value: 'config' }
        )
    )
    .addStringOption(opt =>
      opt.setName('level')
        .setDescription('Guardian level')
        .setRequired(false)
        .addChoices(
          { name: 'Level 1 - Watch', value: 'watch' },
          { name: 'Level 2 - Warn', value: 'warn' },
          { name: 'Level 3 - Act', value: 'act' },
          { name: 'Level 4 - Protect', value: 'protect' }
        )
    ),

  cooldown: 10,
  aliases: ['anguardian', 'aguardian'],
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

    const action = isSlash ? (interaction.options.getString('action') || 'status') : (args[0] || 'status');
    const level = isSlash ? interaction.options.getString('level') : args[1];

    try {
      if (action === 'enable') {
        const guardianLevel = level || 'act';
        await securityEngine.setGuardianMode(interaction.guild.id, true, guardianLevel);
        const levelDescriptions = {
          watch: '👁️ Watch - Observes and reports threats',
          warn: '⚠️ Warn - Issues warnings for suspicious activity',
          act: '⚡ Act - Takes automatic action against threats',
          protect: '🛡️ Protect - Full auto-protection with rollback'
        };
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('😇 Guardian Angel Mode Enabled')
          .setDescription('Guardian angel mode is now **ACTIVE**. I will auto-respond to threats.')
          .addFields(
            { name: 'Mode', value: '😇 Guardian Angel', inline: true },
            { name: 'Level', value: guardianLevel.charAt(0).toUpperCase() + guardianLevel.slice(1), inline: true },
            { name: 'Description', value: levelDescriptions[guardianLevel] || 'Auto-respond to threats', inline: false },
            { name: 'Enabled By', value: user.tag, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (action === 'disable') {
        await securityEngine.setGuardianMode(interaction.guild.id, false);
        const embed = new EmbedBuilder()
          .setColor(0xff9900)
          .setTitle('😇 Guardian Angel Mode Disabled')
          .setDescription('Guardian angel mode is now **INACTIVE**. Manual intervention required for threats.')
          .addFields(
            { name: 'Mode', value: 'Standard', inline: true },
            { name: 'Disabled By', value: user.tag, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (action === 'config') {
        if (!level) {
          const embed = new EmbedBuilder()
            .setColor(0xff9900)
            .setTitle('⚠️ Missing Level')
            .setDescription('Please specify a guardian level.')
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }
        await securityEngine.setGuardianMode(interaction.guild.id, true, level);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('😇 Guardian Level Updated')
          .setDescription(`Guardian level has been set to **${level}**.`)
          .addFields(
            { name: 'New Level', value: level.charAt(0).toUpperCase() + level.slice(1), inline: true },
            { name: 'Updated By', value: user.tag, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (action === 'status') {
        const guardianStatus = await securityEngine.getGuardianStatus(interaction.guild.id);
        const isActive = guardianStatus?.active;
        const embed = new EmbedBuilder()
          .setColor(isActive ? 0x00ff00 : 0xff9900)
          .setTitle('😇 Guardian Angel Status')
          .setDescription(`Guardian angel status for **${interaction.guild.name}**`)
          .addFields(
            { name: 'Status', value: isActive ? '🟢 Active' : '🟡 Inactive', inline: true },
            { name: 'Level', value: guardianStatus?.level || 'Not set', inline: true },
            { name: 'Threats Prevented', value: String(guardianStatus?.threatsPrevented || 0), inline: true },
            { name: 'Actions Taken', value: String(guardianStatus?.actionsTaken || 0), inline: true },
            { name: 'Last Intervention', value: guardianStatus?.lastIntervention || 'None', inline: true },
            { name: 'Uptime', value: guardianStatus?.uptime || 'N/A', inline: true }
          )
          .setTimestamp();

        if (guardianStatus?.recentActions?.length) {
          const actions = guardianStatus.recentActions.slice(0, 5).map(a =>
            `\`${a.time}\` ${a.action} - ${a.target}`
          ).join('\n');
          embed.addFields({ name: '🕐 Recent Actions', value: actions });
        }

        const levelInfo = {
          watch: '👁️ Watch: Observes and reports',
          warn: '⚠️ Warn: Issues warnings',
          act: '⚡ Act: Takes automatic action',
          protect: '🛡️ Protect: Full auto-protection'
        };
        embed.addFields({ name: 'Levels', value: Object.values(levelInfo).join('\n') });

        return interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Error')
        .setDescription(`Guardian operation failed: ${error.message}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};

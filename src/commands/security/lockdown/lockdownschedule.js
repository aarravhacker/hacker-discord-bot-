const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdownschedule')
    .setDescription('Schedule lockdowns')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a scheduled lockdown')
        .addStringOption(opt =>
          opt.setName('time').setDescription('When to lockdown (e.g., 2h, 30m, 1d)').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('reason').setDescription('Reason for lockdown').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('duration').setDescription('Lockdown duration in minutes')
        )
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List scheduled lockdowns')
    )
    .addSubcommand(sub =>
      sub.setName('cancel')
        .setDescription('Cancel a scheduled lockdown')
        .addIntegerOption(opt =>
          opt.setName('id').setDescription('Schedule ID to cancel').setRequired(true)
        )
    ),
  cooldown: 5,
  aliases: ['ldscheduled', 'lockdowntimer'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription('You need Administrator permission to use this command.');
      return interaction.reply({ embeds: [embed] });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || '').toLowerCase();

    try {
      const schedules = securityEngine.profiles.get(`schedules:${guild.id}`) || [];

      if (subcommand === 'create') {
        const timeStr = isSlash ? interaction.options.getString('time') : (args[1] || '');
        const reason = isSlash ? interaction.options.getString('reason') : (args.slice(2).join(' ') || 'Scheduled lockdown');
        const duration = isSlash ? interaction.options.getInteger('duration') : parseInt(args[1]) || null;

        if (!timeStr) {
          const embed = new EmbedBuilder()
            .setTitle('❌ Missing Time')
            .setDescription('Please provide a time. Examples: `2h`, `30m`, `1d`')
            .setColor(0xff0000)
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        let ms = 0;
        const match = timeStr.match(/^(\d+)(m|h|d)$/);
        if (match) {
          const val = parseInt(match[1]);
          const unit = match[2];
          if (unit === 'm') ms = val * 60000;
          else if (unit === 'h') ms = val * 3600000;
          else if (unit === 'd') ms = val * 86400000;
        }

        if (ms <= 0) {
          const embed = new EmbedBuilder()
            .setTitle('❌ Invalid Time Format')
            .setDescription('Please use a valid format like `30m`, `2h`, or `1d`.')
            .setColor(0xff0000)
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        const schedule = {
          id: schedules.length + 1,
          createdBy: user.id,
          createdByName: user.tag,
          scheduledFor: Date.now() + ms,
          duration: duration || null,
          reason,
          status: 'pending',
          createdAt: Date.now()
        };

        schedules.push(schedule);
        securityEngine.profiles.set(`schedules:${guild.id}`, schedules);

        securityEngine.logIncident(guild.id, user.id, 'lockdown_scheduled', {
          scheduleId: schedule.id,
          scheduledFor: new Date(schedule.scheduledFor).toISOString(),
          reason,
          duration
        });

        const embed = new EmbedBuilder()
          .setTitle('⏰ Lockdown Scheduled')
          .setDescription(`A lockdown has been scheduled.`)
          .addFields(
            { name: 'Schedule ID', value: `#${schedule.id}`, inline: true },
            { name: 'Scheduled For', value: `<t:${Math.floor(schedule.scheduledFor / 1000)}:F>`, inline: true },
            { name: 'Duration', value: duration ? `${duration} minutes` : 'Until manually unlocked', inline: true },
            { name: 'Reason', value: reason, inline: false },
            { name: 'Created By', value: user.tag, inline: true }
          )
          .setColor(0xfee75c)
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'list') {
        const pending = schedules.filter(s => s.status === 'pending');
        const completed = schedules.filter(s => s.status !== 'pending');

        const embed = new EmbedBuilder()
          .setTitle('📋 Scheduled Lockdowns')
          .setDescription(`Showing **${schedules.length}** scheduled lockdowns.`)
          .setColor(0x5865f2)
          .setTimestamp()
          .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

        if (pending.length > 0) {
          const pendingList = pending.map(s =>
            `**#${s.id}** — <t:${Math.floor(s.scheduledFor / 1000)}:F> (${s.status})\n> Reason: ${s.reason}`
          ).join('\n');
          embed.addFields({ name: '⏰ Pending', value: pendingList, inline: false });
        } else {
          embed.addFields({ name: '⏰ Pending', value: 'No pending lockdowns.', inline: false });
        }

        if (completed.length > 0) {
          const completedList = completed.slice(-5).map(s =>
            `**#${s.id}** — ${s.status} (created <t:${Math.floor(s.createdAt / 1000)}:R>)`
          ).join('\n');
          embed.addFields({ name: '✅ Completed', value: completedList, inline: false });
        }

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'cancel') {
        const scheduleId = isSlash ? interaction.options.getInteger('id') : parseInt(args[1]);

        if (!scheduleId) {
          const embed = new EmbedBuilder()
            .setTitle('❌ Missing ID')
            .setDescription('Please provide a schedule ID to cancel.')
            .setColor(0xff0000)
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        const schedule = schedules.find(s => s.id === scheduleId && s.status === 'pending');

        if (!schedule) {
          const embed = new EmbedBuilder()
            .setTitle('❌ Schedule Not Found')
            .setDescription(`Schedule #${scheduleId} not found or already processed.`)
            .setColor(0xff0000)
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        schedule.status = 'cancelled';
        schedule.cancelledBy = user.id;
        schedule.cancelledAt = Date.now();
        securityEngine.profiles.set(`schedules:${guild.id}`, schedules);

        securityEngine.logIncident(guild.id, user.id, 'lockdown_schedule_cancelled', {
          scheduleId,
          cancelledBy: user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle('❌ Lockdown Cancelled')
          .setDescription(`Scheduled lockdown **#${scheduleId}** has been cancelled.`)
          .addFields(
            { name: 'Reason', value: schedule.reason, inline: true },
            { name: 'Originally For', value: `<t:${Math.floor(schedule.scheduledFor / 1000)}:F>`, inline: true },
            { name: 'Cancelled By', value: user.tag, inline: true }
          )
          .setColor(0xffa500)
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Subcommand')
        .setDescription('Available subcommands: `create`, `list`, `cancel`')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to manage lockdown schedule.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};

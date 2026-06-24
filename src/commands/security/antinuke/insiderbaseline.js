const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('insiderbaseline')
    .setDescription('Set staff activity baseline for insider detection')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set baseline for a user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('Target user').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('messages').setDescription('Normal message count per hour').setMinValue(0)
        )
        .addIntegerOption(opt =>
          opt.setName('actions').setDescription('Normal action count per hour').setMinValue(0)
        )
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View baseline for a user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('Target user')
        )
    )
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Reset baseline for a user or all users')
        .addUserOption(opt =>
          opt.setName('user').setDescription('Target user (leave empty for all)')
        )
    ),
  cooldown: 5,
  aliases: ['ibaseline', 'baseline'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    try {
      if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription('You need Administrator permission to use this command.');
        return interaction.reply({ embeds: [embed] });
      }

      const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || '').toLowerCase();

      if (!global.insiderBaselines) global.insiderBaselines = {};

      if (subcommand === 'set') {
        const targetUser = isSlash
          ? interaction.options.getUser('user')
          : (args[1] ? guild.members.cache.get(args[1].replace(/[^0-9]/g, ''))?.user : null);

        if (!targetUser) {
          const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription('Please specify a valid user.');
          return interaction.reply({ embeds: [embed] });
        }

        const messages = isSlash ? interaction.options.getInteger('messages') : parseInt(args[2]);
        const actions = isSlash ? interaction.options.getInteger('actions') : parseInt(args[3]);

        const key = `${guild.id}:${targetUser.id}`;
        if (!global.insiderBaselines[key]) {
          global.insiderBaselines[key] = {
            userId: targetUser.id,
            guildId: guild.id,
            normalMessageRate: 0,
            normalActionRate: 0,
            setBy: user.tag,
            setAt: Date.now(),
            lastUpdated: Date.now()
          };
        }

        const baseline = global.insiderBaselines[key];
        if (!isNaN(messages)) baseline.normalMessageRate = messages;
        if (!isNaN(actions)) baseline.normalActionRate = actions;
        baseline.lastUpdated = Date.now();
        baseline.setBy = user.tag;

        const profile = securityEngine.getProfile(guild.id, targetUser.id);
        if (baseline.normalMessageRate === 0 && profile.messageCount > 0) {
          baseline.normalMessageRate = Math.round(profile.messageCount / Math.max(1, (Date.now() - profile.firstSeen) / 3600000));
        }

        const embed = new EmbedBuilder()
          .setTitle('✅ Baseline Set')
          .setColor(0x57f287)
          .setDescription(`Activity baseline configured for **${targetUser.tag}**.`)
          .addFields(
            { name: 'User', value: `${targetUser.tag}`, inline: true },
            { name: 'Messages/Hour', value: `**${baseline.normalMessageRate}**`, inline: true },
            { name: 'Actions/Hour', value: `**${baseline.normalActionRate}**`, inline: true },
            { name: 'Set By', value: `${user.tag}`, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'view') {
        const targetUser = isSlash
          ? interaction.options.getUser('user')
          : (args[1] ? guild.members.cache.get(args[1].replace(/[^0-9]/g, ''))?.user : null);

        if (targetUser) {
          const key = `${guild.id}:${targetUser.id}`;
          const baseline = global.insiderBaselines?.[key];

          if (!baseline) {
            const embed = new EmbedBuilder()
              .setColor(0xffa500)
              .setDescription(`No baseline set for **${targetUser.tag}**.`);
            return interaction.reply({ embeds: [embed] });
          }

          const profile = securityEngine.getProfile(guild.id, targetUser.id);
          const currentMsgRate = profile.messageCount / Math.max(1, (Date.now() - profile.firstSeen) / 3600000);
          const deviation = baseline.normalMessageRate > 0
            ? Math.round(((currentMsgRate - baseline.normalMessageRate) / baseline.normalMessageRate) * 100)
            : 0;

          const embed = new EmbedBuilder()
            .setTitle(`📊 Baseline: ${targetUser.tag}`)
            .setColor(Math.abs(deviation) > 50 ? 0xff6600 : 0x00ff00)
            .addFields(
              { name: 'Normal Msgs/Hour', value: `**${baseline.normalMessageRate}**`, inline: true },
              { name: 'Normal Actions/Hour', value: `**${baseline.normalActionRate}**`, inline: true },
              { name: 'Current Msg Rate', value: `**${currentMsgRate.toFixed(1)}**/hr`, inline: true },
              { name: 'Deviation', value: `**${deviation > 0 ? '+' : ''}${deviation}%**`, inline: true },
              { name: 'Set By', value: `${baseline.setBy}`, inline: true },
              { name: 'Set At', value: `<t:${Math.floor(baseline.setAt / 1000)}:R>`, inline: true }
            )
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        const allBaselines = Object.entries(global.insiderBaselines || {})
          .filter(([k]) => k.startsWith(guild.id));

        if (allBaselines.length === 0) {
          const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription('No baselines configured for this server.');
          return interaction.reply({ embeds: [embed] });
        }

        const list = allBaselines.slice(0, 15).map(([key, b]) => {
          const m = guild.members.cache.get(b.userId);
          return `• **${m ? m.user.tag : b.userId}** — Msgs: ${b.normalMessageRate}/hr | Actions: ${b.normalActionRate}/hr`;
        }).join('\n');

        const embed = new EmbedBuilder()
          .setTitle('📊 Staff Activity Baselines')
          .setColor(0x0099ff)
          .setDescription(list.substring(0, 2048))
          .setFooter({ text: `${allBaselines.length} total baselines` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'reset') {
        const targetUser = isSlash
          ? interaction.options.getUser('user')
          : (args[1] ? guild.members.cache.get(args[1].replace(/[^0-9]/g, ''))?.user : null);

        if (targetUser) {
          const key = `${guild.id}:${targetUser.id}`;
          if (global.insiderBaselines?.[key]) {
            delete global.insiderBaselines[key];
            const embed = new EmbedBuilder()
              .setTitle('✅ Baseline Reset')
              .setColor(0x57f287)
              .setDescription(`Baseline for **${targetUser.tag}** has been cleared.`)
              .setTimestamp();
            return interaction.reply({ embeds: [embed] });
          }

          const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription(`No baseline found for **${targetUser.tag}**.`);
          return interaction.reply({ embeds: [embed] });
        }

        let count = 0;
        Object.keys(global.insiderBaselines || {}).forEach(key => {
          if (key.startsWith(guild.id)) {
            delete global.insiderBaselines[key];
            count++;
          }
        });

        const embed = new EmbedBuilder()
          .setTitle('✅ All Baselines Reset')
          .setColor(0x57f287)
          .setDescription(`Cleared **${count}** staff baselines for this server.`)
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription('Invalid subcommand. Use `set`, `view`, or `reset`.');
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while managing baselines.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};

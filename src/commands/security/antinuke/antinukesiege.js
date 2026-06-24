const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');
const logger = require('../../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukesiege')
    .setDescription('Multi-stage siege detection - detect coordinated attacks')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('start').setDescription('Start siege monitoring'))
    .addSubcommand(sub =>
      sub.setName('stop').setDescription('Stop siege monitoring'))
    .addSubcommand(sub =>
      sub.setName('status').setDescription('View siege detection status'))
    .addSubcommand(sub =>
      sub.setName('threats').setDescription('View current threat actors'))
    .addSubcommand(sub =>
      sub.setName('block')
        .setDescription('Block a threat actor')
        .addUserOption(opt => opt.setName('user').setDescription('User to block').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('report').setDescription('Generate siege analysis report')),

  cooldown: 5,
  aliases: ['asiege', 'siegedetect'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permission.', ephemeral: true });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'status').toLowerCase();

    if (subcommand === 'start') {
      securityEngine.setStage(interaction.guild.id, 2, 'Siege monitoring started');
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff8800).setDescription('Siege monitoring activated. Stage set to **Alert**. All suspicious activity will be tracked.')] });
    }

    if (subcommand === 'stop') {
      securityEngine.setStage(interaction.guild.id, 0, 'Siege monitoring stopped');
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription('Siege monitoring deactivated. Stage set to **Normal**.')] });
    }

    if (subcommand === 'status') {
      const stage = securityEngine.getStage(interaction.guild.id);
      const attacks = securityEngine.analyzeAttacks(interaction.guild.id, 1);
      const raidGroup = securityEngine.detectRaidGroup(interaction.guild.id);
      const altNetwork = securityEngine.detectAltNetwork(interaction.guild.id);

      const embed = new EmbedBuilder()
        .setColor(stage.stage > 0 ? 0xff8800 : 0x00ff00)
        .setTitle('Siege Detection Status')
        .addFields(
          { name: 'Current Stage', value: `**${stage.name}** (Level ${stage.stage})`, inline: true },
          { name: 'Attacks (24h)', value: `${attacks.totalAttacks || 0}`, inline: true },
          { name: 'Raid Groups', value: raidGroup ? `${raidGroup.length} detected` : 'None', inline: true },
          { name: 'Alt Accounts', value: altNetwork ? `${altNetwork.length} suspected` : 'None', inline: true },
          { name: 'Avg Per Day', value: `${attacks.averagePerDay || 0}`, inline: true },
          { name: 'Top Attackers', value: attacks.topAttackers?.length ? attacks.topAttackers.slice(0, 3).map(a => `<@${a.id}> (${a.count})`).join('\n') : 'None' }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'threats') {
      const incidents = securityEngine.getIncidents(interaction.guild.id, 50);
      const threatMap = {};
      for (const inc of incidents) {
        if (inc.userId && inc.userId !== 'system' && inc.userId !== 'decoy') {
          if (!threatMap[inc.userId]) threatMap[inc.userId] = { count: 0, types: new Set() };
          threatMap[inc.userId].count++;
          threatMap[inc.userId].types.add(inc.type);
        }
      }

      const threats = Object.entries(threatMap).map(([id, data]) => ({ id, count: data.count, types: [...data.types] })).sort((a, b) => b.count - a.count).slice(0, 20);

      const embed = new EmbedBuilder()
        .setColor(threats.length > 0 ? 0xff0000 : 0x00ff00)
        .setTitle('Threat Actors')
        .setDescription(threats.length > 0 ? `${threats.length} threat actors identified` : 'No active threats detected')
        .setTimestamp();

      if (threats.length > 0) {
        const list = threats.map(t => `<@${t.id}> - **${t.count}** incidents (${t.types.join(', ')})`).join('\n');
        embed.addFields({ name: 'Threats', value: list.substring(0, 1024) });
      }

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'block') {
      const target = isSlash ? interaction.options.getUser('user') : null;
      if (!target) return interaction.reply({ content: 'Provide a user to block.', ephemeral: true });
      const config = { blockedUsers: [] };
      const guildData = require('../../../db/guildRepository').getGuild(interaction.guild.id);
      // Add to blacklist
      const { getGuild, updateGuild } = require('../../../db/guildRepository');
      const gd = await getGuild(interaction.guild.id);
      const bl = JSON.parse(gd.blacklist || '[]');
      if (!bl.includes(target.id)) bl.push(target.id);
      await updateGuild(interaction.guild.id, { blacklist: JSON.stringify(bl) });
      await addSecurityLog({ guild_id: interaction.guild.id, user_id: user.id, action: 'user_blocked', type: 'antinuke', details: JSON.stringify({ target: target.id, tag: target.tag }) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription(`**${target.tag}** has been blocked from using the bot.`)] });
    }

    if (subcommand === 'report') {
      await interaction.deferReply();
      const report = securityEngine.analyzeAttacks(interaction.guild.id, 7);
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('7-Day Siege Report')
        .setDescription(`Analysis for **${interaction.guild.name}**`)
        .addFields(
          { name: 'Total Attacks', value: `${report.totalAttacks}`, inline: true },
          { name: 'Avg Per Day', value: `${report.averagePerDay}`, inline: true },
          { name: 'Unique Attackers', value: `${report.topAttackers.length}`, inline: true }
        )
        .setTimestamp();

      if (Object.keys(report.attackTypes).length > 0) {
        const types = Object.entries(report.attackTypes).map(([t, c]) => `**${t}**: ${c}`).join('\n');
        embed.addFields({ name: 'Attack Types', value: types });
      }

      if (report.topAttackers.length > 0) {
        const atk = report.topAttackers.slice(0, 5).map(a => `<@${a.id}> - ${a.count} attacks`).join('\n');
        embed.addFields({ name: 'Top Attackers', value: atk });
      }

      return interaction.editReply({ embeds: [embed] });
    }
  }
};

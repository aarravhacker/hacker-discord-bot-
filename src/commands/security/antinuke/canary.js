const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('canary')
    .setDescription('Manage canary tokens for data leak detection')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('deploy')
        .setDescription('Deploy a canary token')
        .addStringOption(opt =>
          opt.setName('type').setDescription('Canary type').setRequired(true)
            .addChoices(
              { name: 'Role', value: 'role' },
              { name: 'Channel', value: 'channel' },
              { name: 'Invite', value: 'invite' },
              { name: 'Webhook', value: 'webhook' }
            )
        )
        .addStringOption(opt =>
          opt.setName('name').setDescription('Canary token name').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List all canary tokens')
    )
    .addSubcommand(sub =>
      sub.setName('monitor').setDescription('Monitor canary token activity')
    ),
  cooldown: 5,
  aliases: ['canary', 'canarytoken'],
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

      if (subcommand === 'deploy') {
        const type = isSlash
          ? interaction.options.getString('type')
          : (args[1] || '').toLowerCase();
        const name = isSlash
          ? interaction.options.getString('name')
          : args.slice(2).join(' ');

        if (!type || !['role', 'channel', 'invite', 'webhook'].includes(type)) {
          const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription('Please provide a valid type: `role`, `channel`, `invite`, or `webhook`.');
          return interaction.reply({ embeds: [embed] });
        }

        if (!name) {
          const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription('Please provide a name for the canary token.');
          return interaction.reply({ embeds: [embed] });
        }

        const canaryId = `canary_${Date.now()}`;
        securityEngine.createDecoy(guild.id, 'canary', {
          id: canaryId,
          name: name,
          canaryType: type,
          deployedBy: user.tag,
          deployedAt: Date.now(),
          accessCount: 0
        });

        const typeDescriptions = {
          role: 'A decoy role that alerts when assigned or modified',
          channel: 'A decoy channel that alerts on unauthorized access',
          invite: 'A decoy invite link that alerts on use',
          webhook: 'A decoy webhook that alerts on message sending'
        };

        const embed = new EmbedBuilder()
          .setTitle('🐤 Canary Token Deployed')
          .setDescription(`Canary token **${name}** is now active.`)
          .setColor(0x0099ff)
          .addFields(
            { name: 'Type', value: type, inline: true },
            { name: 'Name', value: name, inline: true },
            { name: 'ID', value: `\`${canaryId}\``, inline: true },
            { name: 'Purpose', value: typeDescriptions[type] || 'Detects unauthorized access', inline: false },
            { name: 'Deployed By', value: `${user.tag}`, inline: true }
          )
          .setFooter({ text: 'Any access to this canary will trigger an immediate alert.' })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'list') {
        const canaries = securityEngine.getDecoys(guild.id).filter(d => d.type === 'canary');

        const embed = new EmbedBuilder()
          .setTitle('🐤 Canary Tokens')
          .setDescription(canaries.length > 0 ? 'All deployed canary tokens:' : 'No canary tokens deployed.')
          .setColor(canaries.length > 0 ? 0x0099ff : 0x57f287)
          .setTimestamp();

        if (canaries.length > 0) {
          embed.addFields(
            canaries.slice(0, 25).map(c => ({
              name: `${c.data?.canaryType || 'unknown'} — ${c.data?.name || 'Unnamed'}`,
              value: `ID: \`${c.data?.id || 'N/A'}\`\nTriggered: ${c.triggered ? '**YES** (' + c.triggerCount + 'x)' : 'No'}\nDeployed: <t:${Math.floor(c.created / 1000)}:R> by ${c.data?.deployedBy || 'Unknown'}`,
              inline: false
            }))
          );
        }

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'monitor') {
        const canaries = securityEngine.getDecoys(guild.id).filter(d => d.type === 'canary');
        const incidents = securityEngine.getIncidents(guild.id, 200).filter(i => i.type === 'decoy_triggered');
        const triggered = canaries.filter(c => c.triggered);

        let color = 0x00ff00;
        if (triggered.length > 0) color = 0xff0000;
        else if (canaries.length > 0) color = 0x0099ff;

        const embed = new EmbedBuilder()
          .setTitle('🐤 Canary Token Monitor')
          .setDescription('Real-time canary token monitoring.')
          .setColor(color)
          .setTimestamp()
          .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

        embed.addFields(
          { name: 'Total Canaries', value: `**${canaries.length}**`, inline: true },
          { name: 'Active', value: `**${canaries.length - triggered.length}**`, inline: true },
          { name: 'Triggered', value: `**${triggered.length}**`, inline: true },
          { name: 'Total Access Events', value: `**${incidents.length}**`, inline: true }
        );

        if (triggered.length > 0) {
          const triggeredList = triggered.slice(0, 8).map(c => {
            return `🔴 **${c.data?.name || 'Unnamed'}** (${c.data?.canaryType || 'unknown'})\n> Triggered **${c.triggerCount}** time(s)`;
          }).join('\n\n');

          embed.addFields({
            name: '⚠️ Triggered Canaries',
            value: triggeredList.substring(0, 1024),
            inline: false
          });

          embed.addFields({
            name: '🚨 Security Alert',
            value: 'One or more canary tokens have been triggered. This may indicate data leakage or unauthorized access. Investigate immediately.',
            inline: false
          });
        } else {
          embed.addFields({
            name: '✅ Status',
            value: 'All canary tokens are secure. No unauthorized access detected.',
            inline: false
          });
        }

        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription('Invalid subcommand. Use `deploy`, `list`, or `monitor`.');
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while managing canary tokens.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};

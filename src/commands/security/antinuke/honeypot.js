const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('honeypot')
    .setDescription('Manage honeypot decoys')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Set up a honeypot decoy')
        .addStringOption(opt =>
          opt.setName('type').setDescription('Honeypot type').setRequired(true)
            .addChoices(
              { name: 'Channel', value: 'channel' },
              { name: 'Role', value: 'role' },
              { name: 'Webhook', value: 'webhook' },
              { name: 'Integration', value: 'integration' }
            )
        )
        .addStringOption(opt =>
          opt.setName('name').setDescription('Name for the honeypot').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List all honeypots')
    )
    .addSubcommand(sub =>
      sub.setName('monitor').setDescription('Monitor honeypot activity')
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a honeypot')
        .addStringOption(opt =>
          opt.setName('id').setDescription('Honeypot ID to remove').setRequired(true)
        )
    ),
  cooldown: 5,
  aliases: ['honeypot', 'hp'],
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

      if (subcommand === 'setup') {
        const type = isSlash
          ? interaction.options.getString('type')
          : (args[1] || '').toLowerCase();
        const name = isSlash
          ? interaction.options.getString('name')
          : args.slice(2).join(' ');

        if (!type || !['channel', 'role', 'webhook', 'integration'].includes(type)) {
          const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription('Please provide a valid type: `channel`, `role`, `webhook`, or `integration`.');
          return interaction.reply({ embeds: [embed] });
        }

        if (!name) {
          const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription('Please provide a name for the honeypot.');
          return interaction.reply({ embeds: [embed] });
        }

        const honeypotId = `hp_${Date.now()}`;
        const decoy = securityEngine.createDecoy(guild.id, type, {
          id: honeypotId,
          name: name,
          createdBy: user.tag,
          createdAt: Date.now()
        });

        const embed = new EmbedBuilder()
          .setTitle('🪤 Honeypot Created')
          .setDescription(`Honeypot **${type}** has been deployed successfully.`)
          .setColor(0xffa500)
          .addFields(
            { name: 'Type', value: type, inline: true },
            { name: 'Name', value: name, inline: true },
            { name: 'ID', value: `\`${honeypotId}\``, inline: true },
            { name: 'Created By', value: `${user.tag}`, inline: true }
          )
          .setFooter({ text: 'Any interaction with this honeypot will trigger an alert.' })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'list') {
        const honeypots = securityEngine.getDecoys(guild.id);

        const embed = new EmbedBuilder()
          .setTitle('🪤 Honeypot List')
          .setDescription(honeypots.length > 0 ? 'All deployed honeypots:' : 'No honeypots deployed.')
          .setColor(honeypots.length > 0 ? 0xffa500 : 0x57f287)
          .setTimestamp();

        if (honeypots.length > 0) {
          embed.addFields(
            honeypots.slice(0, 25).map(h => ({
              name: `${h.type} — ${h.data?.name || 'Unnamed'}`,
              value: `ID: \`${h.data?.id || 'N/A'}\` | Triggered: ${h.triggered ? '**YES** (' + h.triggerCount + 'x)' : 'No'}\nCreated: <t:${Math.floor(h.created / 1000)}:R>`,
              inline: false
            }))
          );
        }

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'monitor') {
        const honeypots = securityEngine.getDecoys(guild.id);
        const incidents = securityEngine.getIncidents(guild.id, 200);
        const triggered = honeypots.filter(h => h.triggered);
        const honeypotIncidents = incidents.filter(i => i.type === 'decoy_triggered');

        let color = 0x00ff00;
        if (triggered.length > 0) color = 0xffa500;
        if (honeypotIncidents.length > 5) color = 0xff0000;

        const embed = new EmbedBuilder()
          .setTitle('🪤 Honeypot Monitor')
          .setDescription('Real-time honeypot activity monitoring.')
          .setColor(color)
          .setTimestamp()
          .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

        embed.addFields(
          { name: 'Total Honeypots', value: `**${honeypots.length}**`, inline: true },
          { name: 'Active', value: `**${honeypots.length - triggered.length}**`, inline: true },
          { name: 'Triggered', value: `**${triggered.length}**`, inline: true },
          { name: 'Total Events', value: `**${honeypotIncidents.length}**`, inline: true }
        );

        if (honeypotIncidents.length > 0) {
          const recentEvents = honeypotIncidents.slice(0, 8).map(inc => {
            const member = guild.members.cache.get(inc.userId);
            return `• **${inc.details.type}** triggered by ${member ? member.user.tag : inc.userId} — <t:${Math.floor(inc.timestamp / 1000)}:R>`;
          }).join('\n');

          embed.addFields({
            name: '🕐 Recent Events',
            value: recentEvents.substring(0, 1024),
            inline: false
          });
        }

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'remove') {
        const id = isSlash
          ? interaction.options.getString('id')
          : (args[1] || '');

        if (!id) {
          const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription('Please provide the honeypot ID to remove.');
          return interaction.reply({ embeds: [embed] });
        }

        const honeypots = securityEngine.getDecoys(guild.id);
        const target = honeypots.find(h => h.data?.id === id);

        if (!target) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(`Honeypot \`${id}\` not found.`);
          return interaction.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
          .setTitle('🪤 Honeypot Removed')
          .setDescription(`Honeypot \`${id}\` has been removed.`)
          .setColor(0x57f287)
          .addFields(
            { name: 'Type', value: target.type, inline: true },
            { name: 'Name', value: target.data?.name || 'Unnamed', inline: true },
            { name: 'Was Triggered', value: target.triggered ? `Yes (${target.triggerCount}x)` : 'No', inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription('Invalid subcommand. Use `setup`, `list`, `monitor`, or `remove`.');
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while managing honeypots.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};

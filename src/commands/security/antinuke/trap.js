const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trap')
    .setDescription('Manage security traps')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a security trap')
        .addStringOption(opt =>
          opt.setName('type').setDescription('Trap type').setRequired(true)
            .addChoices(
              { name: 'Permission', value: 'permission' },
              { name: 'Role', value: 'role' },
              { name: 'Channel', value: 'channel' },
              { name: 'Ban', value: 'ban' }
            )
        )
        .addStringOption(opt =>
          opt.setName('name').setDescription('Trap name').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List all traps')
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a trap')
        .addStringOption(opt =>
          opt.setName('id').setDescription('Trap ID').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('triggered').setDescription('View triggered traps')
    ),
  cooldown: 5,
  aliases: ['trap', 'securitytrap'],
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

      if (subcommand === 'create') {
        const type = isSlash
          ? interaction.options.getString('type')
          : (args[1] || '').toLowerCase();
        const name = isSlash
          ? interaction.options.getString('name')
          : args.slice(2).join(' ');

        if (!type || !['permission', 'role', 'channel', 'ban'].includes(type)) {
          const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription('Please provide a valid type: `permission`, `role`, `channel`, or `ban`.');
          return interaction.reply({ embeds: [embed] });
        }

        if (!name) {
          const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription('Please provide a name for the trap.');
          return interaction.reply({ embeds: [embed] });
        }

        const trapId = `trap_${Date.now()}`;
        securityEngine.createDecoy(guild.id, 'trap', {
          id: trapId,
          name: name,
          trapType: type,
          createdBy: user.tag,
          createdAt: Date.now()
        });

        const typeDescriptions = {
          permission: 'Detects unauthorized permission changes',
          role: 'Detects unauthorized role modifications',
          channel: 'Detects unauthorized channel changes',
          ban: 'Detects unauthorized ban actions'
        };

        const embed = new EmbedBuilder()
          .setTitle('🪤 Trap Created')
          .setDescription(`Security trap **${name}** has been set.`)
          .setColor(0xffa500)
          .addFields(
            { name: 'Type', value: type, inline: true },
            { name: 'Name', value: name, inline: true },
            { name: 'ID', value: `\`${trapId}\``, inline: true },
            { name: 'Description', value: typeDescriptions[type] || 'Monitors for suspicious activity', inline: false },
            { name: 'Created By', value: `${user.tag}`, inline: true }
          )
          .setFooter({ text: 'Any tripped trap will trigger an immediate alert.' })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'list') {
        const traps = securityEngine.getDecoys(guild.id).filter(d => d.type === 'trap');

        const embed = new EmbedBuilder()
          .setTitle('🪤 Security Traps')
          .setDescription(traps.length > 0 ? 'All active traps:' : 'No traps configured.')
          .setColor(traps.length > 0 ? 0xffa500 : 0x57f287)
          .setTimestamp();

        if (traps.length > 0) {
          embed.addFields(
            traps.slice(0, 25).map(t => ({
              name: `${t.data?.trapType || 'unknown'} — ${t.data?.name || 'Unnamed'}`,
              value: `ID: \`${t.data?.id || 'N/A'}\` | Triggered: ${t.triggered ? '**YES**' : 'No'}\nCreated: <t:${Math.floor(t.created / 1000)}:R> by ${t.data?.createdBy || 'Unknown'}`,
              inline: false
            }))
          );
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
            .setDescription('Please provide the trap ID to remove.');
          return interaction.reply({ embeds: [embed] });
        }

        const traps = securityEngine.getDecoys(guild.id).filter(d => d.type === 'trap');
        const target = traps.find(t => t.data?.id === id);

        if (!target) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(`Trap \`${id}\` not found.`);
          return interaction.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
          .setTitle('🪤 Trap Removed')
          .setDescription(`Trap \`${id}\` has been removed.`)
          .setColor(0x57f287)
          .addFields(
            { name: 'Type', value: target.data?.trapType || 'unknown', inline: true },
            { name: 'Name', value: target.data?.name || 'Unnamed', inline: true },
            { name: 'Was Triggered', value: target.triggered ? 'Yes' : 'No', inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'triggered') {
        const traps = securityEngine.getDecoys(guild.id).filter(d => d.type === 'trap' && d.triggered);
        const incidents = securityEngine.getIncidents(guild.id, 200).filter(i => i.type === 'decoy_triggered');

        const embed = new EmbedBuilder()
          .setTitle('🪤 Triggered Traps')
          .setDescription(traps.length > 0 ? 'Traps that have been tripped:' : 'No traps have been triggered.')
          .setColor(traps.length > 0 ? 0xff0000 : 0x57f287)
          .setTimestamp();

        if (traps.length > 0) {
          const trapList = traps.slice(0, 10).map(t => {
            return `🔴 **${t.data?.name || 'Unnamed'}** (${t.data?.trapType || 'unknown'})\n> Triggered **${t.triggerCount}** time(s)`;
          }).join('\n\n');

          embed.addFields({
            name: 'Triggered Traps',
            value: trapList.substring(0, 1024),
            inline: false
          });
        }

        if (incidents.length > 0) {
          const recentEvents = incidents.slice(0, 5).map(inc => {
            const m = guild.members.cache.get(inc.userId);
            return `• Triggered by ${m ? m.user.tag : inc.userId} — <t:${Math.floor(inc.timestamp / 1000)}:R>`;
          }).join('\n');

          embed.addFields({
            name: 'Recent Trigger Events',
            value: recentEvents.substring(0, 1024),
            inline: false
          });
        }

        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription('Invalid subcommand. Use `create`, `list`, `remove`, or `triggered`.');
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while managing traps.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};

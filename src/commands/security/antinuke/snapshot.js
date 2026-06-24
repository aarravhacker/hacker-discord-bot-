const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('snapshot')
    .setDescription('Server state snapshots for recovery')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('create').setDescription('Take a snapshot of current server state')
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('Show all snapshots')
    )
    .addSubcommand(sub =>
      sub.setName('rollback')
        .setDescription('Rollback to a snapshot')
        .addStringOption(opt =>
          opt.setName('timestamp').setDescription('Snapshot timestamp or ID').setRequired(true)
        )
    ),
  cooldown: 5,
  aliases: ['snap', 'backup'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription('You need Administrator permission to use this command.');
      return interaction.reply({ embeds: [embed] });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || '').toLowerCase();

    if (subcommand === 'create') {
      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setDescription('Taking snapshot of current server state...')
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });

      const snapshot = await securityEngine.createSnapshot(interaction.guild.id, interaction.client);

      if (!snapshot) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription('Failed to create snapshot. Guild not found.');
        return interaction.editReply({ embeds: [errEmbed] });
      }

      const updatedEmbed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('Snapshot Created')
        .setDescription('Server state snapshot has been saved successfully.')
        .addFields(
          { name: 'Created By', value: `${user.tag}`, inline: true },
          { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
          { name: 'Channels', value: `${snapshot.channels?.length || 0}`, inline: true },
          { name: 'Roles', value: `${snapshot.roles?.length || 0}`, inline: true },
          { name: 'Members', value: `${snapshot.members?.length || 0}`, inline: true }
        )
        .setTimestamp();
      return interaction.editReply({ embeds: [updatedEmbed] });
    }

    if (subcommand === 'list') {
      const snapshots = securityEngine.getSnapshots(interaction.guild.id);
      const list = snapshots || [];

      const embed = new EmbedBuilder()
        .setColor(list.length > 0 ? 0xfee75c : 0x57f287)
        .setTitle('Server Snapshots')
        .setDescription(list.length > 0 ? 'Available snapshots:' : 'No snapshots found.')
        .setTimestamp();

      if (list.length > 0) {
        embed.addFields(
          list.slice(0, 25).map(s => ({
            name: `Snapshot \`${s.timestamp}\``,
            value: `Created: <t:${Math.floor(s.timestamp / 1000)}:R>\nChannels: ${s.channels?.length || 0} | Roles: ${s.roles?.length || 0} | Members: ${s.members?.length || 0}`,
            inline: false
          }))
        );
      }

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'rollback') {
      const timestamp = isSlash
        ? interaction.options.getString('timestamp')
        : (args[1] || '');

      if (!timestamp) {
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription('Please provide a snapshot timestamp or ID to rollback to.');
        return interaction.reply({ embeds: [embed] });
      }

      await interaction.deferReply();

      const result = await securityEngine.rollback(interaction.guild.id, parseInt(timestamp) || timestamp, interaction.client);

      const resultEmbed = new EmbedBuilder()
        .setColor(result?.success ? 0x57f287 : 0xed4245)
        .setTitle(result?.success ? 'Rollback Complete' : 'Rollback Failed')
        .setDescription(result?.success
          ? `Server has been rolled back to snapshot \`${timestamp}\`.`
          : `Failed to rollback: ${result?.error || 'Unknown error'}`
        )
        .setTimestamp();
      return interaction.editReply({ embeds: [resultEmbed] });
    }

    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setDescription('Invalid subcommand. Use `create`, `list`, or `rollback <timestamp>`.');
    return interaction.reply({ embeds: [embed] });
  }
};

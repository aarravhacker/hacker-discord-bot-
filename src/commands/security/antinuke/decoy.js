const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('decoy')
    .setDescription('Manage honeypot decoys')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a decoy channel or role')
        .addStringOption(opt =>
          opt.setName('type').setDescription('Decoy type').setRequired(true)
            .addChoices(
              { name: 'channel', value: 'channel' },
              { name: 'role', value: 'role' }
            )
        )
        .addStringOption(opt =>
          opt.setName('name').setDescription('Name for the decoy').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('Show all decoys and their status')
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a decoy')
        .addStringOption(opt =>
          opt.setName('id').setDescription('Decoy ID to remove').setRequired(true)
        )
    ),
  cooldown: 5,
  aliases: ['honeypot', 'trap'],
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
      const type = isSlash
        ? interaction.options.getString('type')
        : (args[1] || '').toLowerCase();

      const name = isSlash
        ? interaction.options.getString('name')
        : args.slice(2).join(' ');

      if (!type || !['channel', 'role'].includes(type)) {
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription('Please provide a valid type: `channel` or `role`.');
        return interaction.reply({ embeds: [embed] });
      }

      if (!name) {
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription('Please provide a name for the decoy.');
        return interaction.reply({ embeds: [embed] });
      }

      const decoy = await securityEngine.createDecoy(interaction.guild.id, type, name, user.tag);

      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setTitle('Decoy Created')
        .setDescription(`Honeypot **${type}** decoy created successfully.`)
        .addFields(
          { name: 'Type', value: type, inline: true },
          { name: 'Name', value: name, inline: true },
          { name: 'Created By', value: `${user.tag}`, inline: true },
          { name: 'Decoy ID', value: decoy?.id || 'N/A', inline: true }
        )
        .setFooter({ text: 'Deleting or modifying this decoy will trigger an alert.' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'list') {
      const decoys = await securityEngine.getDecoys(interaction.guild.id);
      const list = decoys || [];

      const embed = new EmbedBuilder()
        .setColor(list.length > 0 ? 0xffa500 : 0x57f287)
        .setTitle('Honeypot Decoys')
        .setDescription(list.length > 0 ? 'Active decoys in this server:' : 'No decoys configured.')
        .setTimestamp();

      if (list.length > 0) {
        embed.addFields(
          list.map(d => ({
            name: `${d.type === 'channel' ? '#' : '@'} ${d.name}`,
            value: `ID: \`${d.id}\` | Triggered: ${d.triggered ? '**YES**' : 'No'} | Created: <t:${Math.floor((d.createdAt || Date.now()) / 1000)}:R>`,
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
          .setDescription('Please provide the decoy ID to remove.');
        return interaction.reply({ embeds: [embed] });
      }

      const removed = await securityEngine.removeDecoy(interaction.guild.id, id);

      const embed = new EmbedBuilder()
        .setColor(removed ? 0x57f287 : 0xed4245)
        .setTitle(removed ? 'Decoy Removed' : 'Decoy Not Found')
        .setDescription(removed
          ? `Decoy \`${id}\` has been removed.`
          : `Could not find decoy with ID \`${id}\`.`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setDescription('Invalid subcommand. Use `create <type> <name>`, `list`, or `remove <id>`.');
    return interaction.reply({ embeds: [embed] });
  }
};

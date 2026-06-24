const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fakeadmin')
    .setDescription('Manage fake admin permission traps')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a fake admin permission trap')
        .addStringOption(opt =>
          opt.setName('name').setDescription('Name for the fake admin trap').setRequired(true)
        )
        .addRoleOption(opt =>
          opt.setName('role').setDescription('Role to use as bait')
        )
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List all fake admin traps')
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a fake admin trap')
        .addStringOption(opt =>
          opt.setName('id').setDescription('Fake admin trap ID').setRequired(true)
        )
    ),
  cooldown: 5,
  aliases: ['fakeadmin', 'fadmin'],
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
        const name = isSlash
          ? interaction.options.getString('name')
          : args.slice(1).join(' ');
        const role = isSlash ? interaction.options.getRole('role') : null;

        if (!name) {
          const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription('Please provide a name for the fake admin trap.');
          return interaction.reply({ embeds: [embed] });
        }

        const fakeAdminId = `fadmin_${Date.now()}`;
        securityEngine.createDecoy(guild.id, 'fakeadmin', {
          id: fakeAdminId,
          name: name,
          baitRole: role ? role.id : null,
          baitRoleName: role ? role.name : null,
          createdBy: user.tag,
          createdAt: Date.now()
        });

        const embed = new EmbedBuilder()
          .setTitle('🎭 Fake Admin Trap Created')
          .setDescription(`Fake admin trap **${name}** is now active.`)
          .setColor(0xffa500)
          .addFields(
            { name: 'Name', value: name, inline: true },
            { name: 'ID', value: `\`${fakeAdminId}\``, inline: true },
            { name: 'Bait Role', value: role ? `${role}` : 'None (auto)', inline: true },
            { name: 'Created By', value: `${user.tag}`, inline: true }
          )
          .setDescription('Any attempt to assign or modify this fake admin permission will trigger an alert.')
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'list') {
        const fakeAdmins = securityEngine.getDecoys(guild.id).filter(d => d.type === 'fakeadmin');

        const embed = new EmbedBuilder()
          .setTitle('🎭 Fake Admin Traps')
          .setDescription(fakeAdmins.length > 0 ? 'All fake admin traps:' : 'No fake admin traps configured.')
          .setColor(fakeAdmins.length > 0 ? 0xffa500 : 0x57f287)
          .setTimestamp();

        if (fakeAdmins.length > 0) {
          embed.addFields(
            fakeAdmins.slice(0, 25).map(f => ({
              name: `${f.data?.name || 'Unnamed'}`,
              value: `ID: \`${f.data?.id || 'N/A'}\`\nBait Role: ${f.data?.baitRoleName || 'Auto'}\nTriggered: ${f.triggered ? '**YES** (' + f.triggerCount + 'x)' : 'No'}\nCreated: <t:${Math.floor(f.created / 1000)}:R> by ${f.data?.createdBy || 'Unknown'}`,
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
            .setDescription('Please provide the fake admin trap ID to remove.');
          return interaction.reply({ embeds: [embed] });
        }

        const fakeAdmins = securityEngine.getDecoys(guild.id).filter(d => d.type === 'fakeadmin');
        const target = fakeAdmins.find(f => f.data?.id === id);

        if (!target) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(`Fake admin trap \`${id}\` not found.`);
          return interaction.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
          .setTitle('🎭 Fake Admin Trap Removed')
          .setDescription(`Fake admin trap \`${id}\` has been removed.`)
          .setColor(0x57f287)
          .addFields(
            { name: 'Name', value: target.data?.name || 'Unnamed', inline: true },
            { name: 'Was Triggered', value: target.triggered ? `Yes (${target.triggerCount}x)` : 'No', inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription('Invalid subcommand. Use `create`, `list`, or `remove`.');
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while managing fake admin traps.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emergency')
    .setDescription('Emergency system - lockdown, freeze, unfreeze, status')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('lockdown').setDescription('Global lockdown - lock all channels, freeze all permissions')
    )
    .addSubcommand(sub =>
      sub.setName('freeze')
        .setDescription('Freeze channels, roles, staff, or global')
        .addStringOption(opt =>
          opt.setName('type').setDescription('What to freeze').setRequired(true)
            .addChoices(
              { name: 'channels', value: 'channels' },
              { name: 'roles', value: 'roles' },
              { name: 'staff', value: 'staff' },
              { name: 'global', value: 'global' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('unfreeze')
        .setDescription('Unfreeze channels, roles, staff, or global')
        .addStringOption(opt =>
          opt.setName('type').setDescription('What to unfreeze').setRequired(true)
            .addChoices(
              { name: 'channels', value: 'channels' },
              { name: 'roles', value: 'roles' },
              { name: 'staff', value: 'staff' },
              { name: 'global', value: 'global' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Show frozen state')
    ),
  cooldown: 5,
  aliases: ['emerg', 'emfreeze'],
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

    if (!subcommand) {
      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription('Please specify a subcommand: `lockdown`, `freeze <type>`, `unfreeze <type>`, or `status`.');
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'lockdown') {
      const result = await securityEngine.freeze(interaction.guild.id, 'global');
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle('Global Lockdown Activated')
        .setDescription('All channels are now locked and permissions frozen.')
        .addFields(
          { name: 'Activated By', value: `${user.tag}`, inline: true },
          { name: 'Server', value: interaction.guild.name, inline: true },
          { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'freeze') {
      const type = isSlash
        ? interaction.options.getString('type')
        : (args[0] || '').toLowerCase();

      if (!type || !['channels', 'roles', 'staff', 'global'].includes(type)) {
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription('Please provide a valid type: `channels`, `roles`, `staff`, or `global`.');
        return interaction.reply({ embeds: [embed] });
      }

      const result = await securityEngine.freeze(interaction.guild.id, type);
      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setTitle(`${type.charAt(0).toUpperCase() + type.slice(1)} Frozen`)
        .setDescription(`Successfully frozen **${type}** in this server.`)
        .addFields(
          { name: 'Frozen By', value: `${user.tag}`, inline: true },
          { name: 'Type', value: type, inline: true },
          { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'unfreeze') {
      const type = isSlash
        ? interaction.options.getString('type')
        : (args[0] || '').toLowerCase();

      if (!type || !['channels', 'roles', 'staff', 'global'].includes(type)) {
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription('Please provide a valid type: `channels`, `roles`, `staff`, or `global`.');
        return interaction.reply({ embeds: [embed] });
      }

      const result = await securityEngine.unfreeze(interaction.guild.id, type);
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle(`${type.charAt(0).toUpperCase() + type.slice(1)} Unfrozen`)
        .setDescription(`Successfully unfrozen **${type}** in this server.`)
        .addFields(
          { name: 'Unfrozen By', value: `${user.tag}`, inline: true },
          { name: 'Type', value: type, inline: true },
          { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'status') {
      const status = await securityEngine.getStage(interaction.guild.id);
      const frozen = status?.frozen || {};
      const entries = Object.entries(frozen).filter(([, v]) => v);

      const embed = new EmbedBuilder()
        .setColor(entries.length > 0 ? 0xffa500 : 0x57f287)
        .setTitle('Emergency Status')
        .setDescription(entries.length > 0 ? 'Active freezes:' : 'No active freezes.')
        .setTimestamp();

      if (entries.length > 0) {
        embed.addFields(
          entries.map(([type, info]) => ({
            name: type.charAt(0).toUpperCase() + type.slice(1),
            value: `Frozen since <t:${Math.floor((info.timestamp || Date.now()) / 1000)}:R>`,
            inline: true
          }))
        );
      }

      return interaction.reply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setDescription('Invalid subcommand. Use `lockdown`, `freeze <type>`, `unfreeze <type>`, or `status`.');
    return interaction.reply({ embeds: [embed] });
  }
};

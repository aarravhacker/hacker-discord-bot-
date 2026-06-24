const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vanityrole')
    .setDescription('Vanity role system - auto-assign role for vanity URL boosters')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub
      .setName('config')
      .setDescription('Configure vanity role')
      .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('reset')
      .setDescription('Reset vanity role configuration'))
    .addSubcommand(sub => sub
      .setName('setup')
      .setDescription('Set up the vanity role')
      .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true))),

  name: 'vanityrole',
  description: 'Vanity role system',
  usage: '!vanityrole <config|reset|setup> [role]',

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const db = getDB();
    const embed = new EmbedBuilder();

    switch (sub) {
      case 'config': {
        const role = interaction.options.getRole('role');

        if (role.position >= interaction.guild.members.me.roles.highest.position) {
          return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('I cannot assign a role higher than or equal to my highest role.')], ephemeral: true });
        }

        await db('vanity_roles').insert({
          guild_id: interaction.guildId,
          role_id: role.id
        }).onConflict('guild_id').merge();

        embed.setColor('#00FF00').setDescription(`✅ Vanity role configured to ${role}.`);
        break;
      }

      case 'reset': {
        await db('vanity_roles').where({ guild_id: interaction.guildId }).del();
        embed.setColor('#FF0000').setDescription('🗑️ Vanity role configuration has been reset.');
        break;
      }

      case 'setup': {
        const role = interaction.options.getRole('role');

        if (role.position >= interaction.guild.members.me.roles.highest.position) {
          return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('I cannot assign a role higher than or equal to my highest role.')], ephemeral: true });
        }

        await db('vanity_roles').insert({
          guild_id: interaction.guildId,
          role_id: role.id
        }).onConflict('guild_id').merge();

        embed.setColor('#00FF00').setDescription(`✅ Vanity role set to ${role}.`);
        break;
      }
    }

    return interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const sub = args[0];
    const db = getDB();
    const embed = new EmbedBuilder();

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('You need Manage Server permission.')] });
    }

    const roleId = args[1]?.replace(/<!?@?|>/g, '');
    const role = message.guild.roles.cache.get(roleId);

    switch (sub) {
      case 'config': {
        if (!role) return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription(`Usage: ${this.usage}`)] });

        if (role.position >= message.guild.members.me.roles.highest.position) {
          return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('I cannot assign a role higher than or equal to my highest role.')] });
        }

        await db('vanity_roles').insert({
          guild_id: message.guildId,
          role_id: role.id
        }).onConflict('guild_id').merge();

        embed.setColor('#00FF00').setDescription(`✅ Vanity role configured to ${role}.`);
        break;
      }

      case 'reset': {
        await db('vanity_roles').where({ guild_id: message.guildId }).del();
        embed.setColor('#FF0000').setDescription('🗑️ Vanity role configuration has been reset.');
        break;
      }

      case 'setup': {
        if (!role) return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Provide a valid role.')] });

        if (role.position >= message.guild.members.me.roles.highest.position) {
          return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('I cannot assign a role higher than or equal to my highest role.')] });
        }

        await db('vanity_roles').insert({
          guild_id: message.guildId,
          role_id: role.id
        }).onConflict('guild_id').merge();

        embed.setColor('#00FF00').setDescription(`✅ Vanity role set to ${role}.`);
        break;
      }

      default:
        return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription(`Invalid subcommand. Usage: ${this.usage}`)] });
    }

    return message.reply({ embeds: [embed] });
  },
  adminOnly: true
};

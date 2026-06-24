const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activityrole')
    .setDescription('Activity role system - auto-assign roles based on activity status')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub
      .setName('config')
      .setDescription('Configure activity role settings')
      .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true))
      .addStringOption(opt => opt.setName('activity').setDescription('Activity text to match').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('reset')
      .setDescription('Reset activity role configuration'))
    .addSubcommand(sub => sub
      .setName('setup')
      .setDescription('Set up the activity role with a role')
      .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true))),

  name: 'activityrole',
  description: 'Activity role system',
  usage: '!activityrole <config|reset|setup> [role] [activity]',

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const db = getDB();
    const embed = new EmbedBuilder();

    switch (sub) {
      case 'config': {
        const role = interaction.options.getRole('role');
        const activity = interaction.options.getString('activity');

        await db('activity_roles').insert({
          guild_id: interaction.guildId,
          role_id: role.id,
          activity_text: activity
        }).onConflict('guild_id').merge();

        embed.setColor('#00FF00').setDescription(`✅ Activity role configured.\n**Role:** ${role}\n**Activity:** \`${activity}\``);
        break;
      }

      case 'reset': {
        await db('activity_roles').where({ guild_id: interaction.guildId }).del();
        embed.setColor('#FF0000').setDescription('🗑️ Activity role configuration has been reset.');
        break;
      }

      case 'setup': {
        const role = interaction.options.getRole('role');

        if (role.position >= interaction.guild.members.me.roles.highest.position) {
          return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('I cannot assign a role higher than or equal to my highest role.')], ephemeral: true });
        }

        await db('activity_roles').insert({
          guild_id: interaction.guildId,
          role_id: role.id,
          activity_text: ''
        }).onConflict('guild_id').merge();

        embed.setColor('#00FF00').setDescription(`✅ Activity role set to ${role}. Use \`config\` to set the activity text.`);
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

    switch (sub) {
      case 'config': {
        const roleId = args[1]?.replace(/<!?@?|>/g, '');
        const role = message.guild.roles.cache.get(roleId);
        const activity = args.slice(2).join(' ');

        if (!role || !activity) return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription(`Usage: ${this.usage}`)] });

        await db('activity_roles').insert({
          guild_id: message.guildId,
          role_id: role.id,
          activity_text: activity
        }).onConflict('guild_id').merge();

        embed.setColor('#00FF00').setDescription(`✅ Activity role configured.\n**Role:** ${role}\n**Activity:** \`${activity}\``);
        break;
      }

      case 'reset': {
        await db('activity_roles').where({ guild_id: message.guildId }).del();
        embed.setColor('#FF0000').setDescription('🗑️ Activity role configuration has been reset.');
        break;
      }

      case 'setup': {
        const roleId = args[1]?.replace(/<!?@?|>/g, '');
        const role = message.guild.roles.cache.get(roleId);

        if (!role) return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Provide a valid role.')] });

        if (role.position >= message.guild.members.me.roles.highest.position) {
          return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('I cannot assign a role higher than or equal to my highest role.')] });
        }

        await db('activity_roles').insert({
          guild_id: message.guildId,
          role_id: role.id,
          activity_text: ''
        }).onConflict('guild_id').merge();

        embed.setColor('#00FF00').setDescription(`✅ Activity role set to ${role}. Use \`config\` to set the activity text.`);
        break;
      }

      default:
        return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription(`Invalid subcommand. Usage: ${this.usage}`)] });
    }

    return message.reply({ embeds: [embed] });
  },
  adminOnly: true
};

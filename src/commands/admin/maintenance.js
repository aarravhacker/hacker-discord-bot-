const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('maintenance')
    .setDescription('Toggle maintenance mode for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('enable')
        .setDescription('Enable maintenance mode (bot ignores non-admin commands)')
    )
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Disable maintenance mode')
    ),
  cooldown: 5,
  aliases: ['maint'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription('You need the **Administrator** permission to use this command.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    let sub;
    if (isSlash) {
      sub = interaction.options.getSubcommand();
    } else {
      const cmdArgs = interaction.content.split(' ').slice(1);
      sub = cmdArgs[0]?.toLowerCase();
    }

    if (!sub || !['enable', 'disable'].includes(sub)) {
      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription('Usage: `!maintenance <enable|disable>`');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const db = getDB();
    const guildId = guild.id;
    const maintenanceEnabled = sub === 'enable';

    try {
      const exists = await db('guild_settings').where({ guild_id: guildId }).first();
      if (exists) {
        await db('guild_settings').where({ guild_id: guildId }).update({ maintenance_enabled: maintenanceEnabled });
      } else {
        await db('guild_settings').insert({ guild_id: guildId, maintenance_enabled: maintenanceEnabled });
      }

      const embed = new EmbedBuilder()
        .setColor(maintenanceEnabled ? 0xffa500 : 0x00ff00)
        .setTitle(maintenanceEnabled ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled')
        .setDescription(
          maintenanceEnabled
            ? 'The bot is now in **maintenance mode**. Non-admin commands are ignored until maintenance is disabled.'
            : 'The bot is now **back to normal**. All commands are available.'
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription('An error occurred while toggling maintenance mode.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};

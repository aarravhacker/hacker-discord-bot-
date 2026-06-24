const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stickstop')
    .setDescription('Stop all sticky messages for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const db = getDB();
    db.prepare('UPDATE stickies SET enabled = 0 WHERE guild_id = ?').run(interaction.guild.id);

    return interaction.reply({ embeds: [new EmbedBuilder()
      .setColor(0xffa500)
      .setDescription('All sticky messages for this server have been disabled.')] });
  },

  prefix: {
    name: 'stickstop',
    async execute(message) {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(0xff0000)
          .setDescription('You need the Manage Messages permission to use this command.')] });
      }

      const db = getDB();
      db.prepare('UPDATE stickies SET enabled = 0 WHERE guild_id = ?').run(message.guild.id);

      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription('All sticky messages for this server have been disabled.')] });
    }
  }
};

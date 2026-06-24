const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getstickies')
    .setDescription('List all sticky messages for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const db = getDB();
    const stickies = db.prepare('SELECT * FROM stickies WHERE guild_id = ?').all(interaction.guild.id);

    if (!stickies.length) {
      return interaction.reply({ embeds: [new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription('No sticky messages found for this server.')] });
    }

    const list = stickies.map((s, i) =>
      `**${i + 1}.** <#${s.channel_id}>\n> ${s.message.substring(0, 100)}${s.message.length > 100 ? '...' : ''}\n> Interval: ${s.interval_seconds}s | Enabled: ${s.enabled ? 'Yes' : 'No'}`
    ).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('Sticky Messages')
      .setDescription(list)
      .setFooter({ text: `Total: ${stickies.length} sticky message(s)` });

    return interaction.reply({ embeds: [embed] });
  },

  prefix: {
    name: 'getstickies',
    async execute(message) {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(0xff0000)
          .setDescription('You need the Manage Messages permission to use this command.')] });
      }

      const db = getDB();
      const stickies = db.prepare('SELECT * FROM stickies WHERE guild_id = ?').all(message.guild.id);

      if (!stickies.length) {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription('No sticky messages found for this server.')] });
      }

      const list = stickies.map((s, i) =>
        `**${i + 1}.** <#${s.channel_id}>\n> ${s.message.substring(0, 100)}${s.message.length > 100 ? '...' : ''}\n> Interval: ${s.interval_seconds}s | Enabled: ${s.enabled ? 'Yes' : 'No'}`
      ).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('Sticky Messages')
        .setDescription(list)
        .setFooter({ text: `Total: ${stickies.length} sticky message(s)` });

      return message.reply({ embeds: [embed] });
    }
  }
};

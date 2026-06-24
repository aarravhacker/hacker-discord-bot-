const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcomepreview')
    .setDescription('Preview the welcome message')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 10,
  aliases: ['welcomeprev'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const db = getDB();
      const existing = await db('welcome').where({ guild_id: interaction.guildId }).first();

      if (!existing) {
        return interaction.reply({ embeds: [errorEmbed('No Config', 'No welcome configuration found. Use `/setwelcome` first.')] });
      }

      const wc = JSON.parse(existing.config || '{}');
      let message = wc.message || 'Welcome to the server, {user}!';
      message = message
        .replace('{user}', interaction.member.toString())
        .replace('{username}', interaction.member.user.username)
        .replace('{server}', interaction.guild.name)
        .replace('{membercount}', interaction.guild.memberCount);

      if (wc.embed) {
        const embed = new EmbedBuilder()
          .setColor(wc.color || config.embedColors.primary)
          .setDescription(message);

        if (wc.title) embed.setTitle(wc.title);
        if (wc.footer) embed.setFooter({ text: wc.footer });
        if (wc.author) embed.setAuthor({ name: wc.author });
        if (wc.image) embed.setImage(wc.image);
        if (wc.thumbnail) embed.setThumbnail(wc.thumbnail);
        if (wc.fields) {
          wc.fields.forEach(f => embed.addFields({ name: f.name, value: f.value, inline: f.inline }));
        }

        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ content: message });
      }
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to preview welcome message.')] });
    }
  }
};

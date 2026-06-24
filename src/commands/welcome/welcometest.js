const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcometest')
    .setDescription('Send a test welcome message to the configured channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 30,
  aliases: ['welcometestmsg'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const db = getDB();
      const existing = await db('welcome').where({ guild_id: interaction.guildId }).first();

      if (!existing || !existing.channel_id) {
        return interaction.reply({ embeds: [errorEmbed('No Channel', 'No welcome channel configured.')] });
      }

      const channel = interaction.guild.channels.cache.get(existing.channel_id);
      if (!channel) {
        return interaction.reply({ embeds: [errorEmbed('Channel Not Found', 'The configured channel no longer exists.')] });
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

        await channel.send({ embeds: [embed] });
      } else {
        await channel.send({ content: message });
      }

      await interaction.reply({ embeds: [successEmbed('Test Sent', `Welcome test message sent to <#${channel.id}>.`)] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to send test message.')] });
    }
  }
};

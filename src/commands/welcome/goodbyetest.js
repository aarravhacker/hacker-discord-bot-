const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('goodbyetest')
    .setDescription('Send a test goodbye message to the configured channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 30,
  aliases: ['goodbyetestmsg'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const db = getDB();
      const existing = await db('goodbye').where({ guild_id: interaction.guildId }).first();

      if (!existing || !existing.channel_id) {
        return interaction.reply({ embeds: [errorEmbed('No Channel', 'No goodbye channel configured.')] });
      }

      const channel = interaction.guild.channels.cache.get(existing.channel_id);
      if (!channel) {
        return interaction.reply({ embeds: [errorEmbed('Channel Not Found', 'The configured channel no longer exists.')] });
      }

      const gc = JSON.parse(existing.config || '{}');
      let message = gc.message || 'Goodbye, {user}! We\'ll miss you!';
      message = message
        .replace('{user}', interaction.member.toString())
        .replace('{username}', interaction.member.user.username)
        .replace('{server}', interaction.guild.name)
        .replace('{membercount}', interaction.guild.memberCount);

      if (gc.embed) {
        const embed = new EmbedBuilder()
          .setColor(gc.color || config.embedColors.primary)
          .setDescription(message);

        if (gc.title) embed.setTitle(gc.title);
        if (gc.footer) embed.setFooter({ text: gc.footer });
        if (gc.author) embed.setAuthor({ name: gc.author });
        if (gc.image) embed.setImage(gc.image);

        await channel.send({ embeds: [embed] });
      } else {
        await channel.send({ content: message });
      }

      await interaction.reply({ embeds: [successEmbed('Test Sent', `Goodbye test message sent to <#${channel.id}>.`)] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to send test message.')] });
    }
  }
};

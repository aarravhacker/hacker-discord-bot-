const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder')
    .addStringOption(opt => opt.setName('time').setDescription('Time (e.g., 10m, 2h, 1d)').setRequired(true))
    .addStringOption(opt => opt.setName('message').setDescription('Reminder message').setRequired(true)),
  cooldown: 5,
  aliases: ['setreminder', 'reminder'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const timeStr = interaction.options?.getString('time') || args[0];
      const message = interaction.options?.getString('message') || args.slice(1).join(' ');

      if (!timeStr || !message) {
        return interaction.reply({ embeds: [errorEmbed('Usage: /remind <time> <message>\nExamples: 10m, 2h, 1d')] });
      }

      let ms = 0;
      const match = timeStr.match(/^(\d+)(s|m|h|d)$/);
      if (!match) {
        return interaction.reply({ embeds: [errorEmbed('Invalid time format. Use s (seconds), m (minutes), h (hours), d (days). Example: 10m')] });
      }

      const value = parseInt(match[1]);
      const unit = match[2];
      switch (unit) {
        case 's': ms = value * 1000; break;
        case 'm': ms = value * 60000; break;
        case 'h': ms = value * 3600000; break;
        case 'd': ms = value * 86400000; break;
      }

      if (ms > 604800000) {
        return interaction.reply({ embeds: [errorEmbed('Maximum reminder time is 7 days.')] });
      }

      const endTime = Date.now() + ms;
      const db = getDB();
      await db('reminders').insert({
        user_id: user.id,
        guild_id: interaction.guild.id,
        channel_id: interaction.channel.id,
        message: message,
        remind_at: new Date(endTime),
        active: true
      });

      await interaction.reply({ embeds: [successEmbed(`Reminder set for <t:${Math.floor(endTime / 1000)}:R>: **${message}**`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to set reminder.')] });
    }
  }
};

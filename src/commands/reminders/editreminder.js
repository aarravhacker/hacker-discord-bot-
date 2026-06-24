const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('editreminder')
    .setDescription('Edit a reminder')
    .addIntegerOption(opt => opt.setName('id').setDescription('Reminder number').setRequired(true))
    .addStringOption(opt => opt.setName('time').setDescription('New time (e.g., 10m, 2h, 1d)').setRequired(true))
    .addStringOption(opt => opt.setName('message').setDescription('New message').setRequired(true)),
  cooldown: 5,
  aliases: ['modifyreminder'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const id = interaction.options?.getInteger('id') || parseInt(args[0]);
      const timeStr = interaction.options?.getString('time') || args[1];
      const message = interaction.options?.getString('message') || args.slice(2).join(' ');

      if (!id || !timeStr || !message) {
        return interaction.reply({ embeds: [errorEmbed('Usage: /editreminder <id> <time> <message>')] });
      }

      let ms = 0;
      const match = timeStr.match(/^(\d+)(s|m|h|d)$/);
      if (!match) {
        return interaction.reply({ embeds: [errorEmbed('Invalid time format. Use s, m, h, or d.')] });
      }

      const value = parseInt(match[1]);
      const unit = match[2];
      switch (unit) {
        case 's': ms = value * 1000; break;
        case 'm': ms = value * 60000; break;
        case 'h': ms = value * 3600000; break;
        case 'd': ms = value * 86400000; break;
      }

      const db = getDB();
      const reminders = await db('reminders')
        .where({ user_id: user.id, guild_id: interaction.guild.id, active: true })
        .orderBy('remind_at', 'asc');

      if (reminders.length === 0) {
        return interaction.reply({ embeds: [errorEmbed('You have no active reminders.')] });
      }

      if (id < 1 || id > reminders.length) {
        return interaction.reply({ embeds: [errorEmbed(`Invalid reminder number. Choose between 1 and ${reminders.length}`)] });
      }

      const reminder = reminders[id - 1];
      const endTime = Date.now() + ms;

      await db('reminders').where({ id: reminder.id }).update({
        message: message,
        remind_at: new Date(endTime)
      });

      await interaction.reply({ embeds: [successEmbed(`Reminder updated! New time: <t:${Math.floor(endTime / 1000)}:R>: **${message}**`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to edit reminder.')] });
    }
  }
};

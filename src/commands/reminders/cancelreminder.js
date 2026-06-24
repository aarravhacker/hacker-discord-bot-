const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cancelreminder')
    .setDescription('Cancel a reminder')
    .addIntegerOption(opt => opt.setName('id').setDescription('Reminder number from /reminders').setRequired(true)),
  cooldown: 5,
  aliases: ['deletereminder'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const id = interaction.options?.getInteger('id') || parseInt(args[0]);
      if (!id) {
        return interaction.reply({ embeds: [errorEmbed('Usage: /cancelreminder <reminder number from /reminders>')] });
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
      await db('reminders').where({ id: reminder.id }).update({ active: false });

      await interaction.reply({ embeds: [successEmbed(`Cancelled reminder: **${reminder.message}**`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to cancel reminder.')] });
    }
  }
};

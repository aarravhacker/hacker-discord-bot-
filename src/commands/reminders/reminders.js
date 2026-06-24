const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed, infoEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reminders')
    .setDescription('List all your active reminders'),
  cooldown: 5,
  aliases: ['myreminders', 'reminderlist'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const db = getDB();
      const reminders = await db('reminders')
        .where({ user_id: user.id, guild_id: interaction.guild.id, active: true })
        .orderBy('remind_at', 'asc');

      if (reminders.length === 0) {
        return interaction.reply({ embeds: [infoEmbed('You have no active reminders.')] });
      }

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.info || '#3498DB')
        .setTitle('Your Active Reminders')
        .setTimestamp();

      const description = reminders.map((r, i) => {
        return `**${i + 1}.** ${r.message}\nReminds: <t:${Math.floor(new Date(r.remind_at).getTime() / 1000)}:R>`;
      }).join('\n\n');

      embed.setDescription(description);
      embed.setFooter({ text: `${reminders.length} active reminder(s)` });
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to list reminders.')] });
    }
  }
};

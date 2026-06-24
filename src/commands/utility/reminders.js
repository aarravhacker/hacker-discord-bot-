const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { formatDuration, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reminders')
    .setDescription('Shows your active reminders'),
  cooldown: 3,
  aliases: ['myreminders', 'rems'],
  prefix: true,
  async execute(interaction) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const user = isSlash ? interaction.user : interaction.author;

            const reminders = (interaction.client.reminders || []).filter(r => r.userId === user.id);

            if (reminders.length === 0) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('You have no active reminders.').setColor(config.embedColors.warning)] });
            }

            const embed = new EmbedBuilder()
              .setTitle('Your Reminders')
              .setColor(config.embedColors.info)
              .setTimestamp();

            reminders.forEach((r, i) => {
              const timeLeft = Math.max(0, r.remindAt - Date.now());
              embed.addFields({
                name: `#${i + 1}`,
                value: `**${r.message}**\nIn: <t:${Math.floor(r.remindAt / 1000)}:R>`,
                inline: false
              });
            });

            embed.setFooter({ text: `${reminders.length} active reminder(s)` });
            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};

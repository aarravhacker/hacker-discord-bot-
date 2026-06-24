const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { formatDuration, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afklist')
    .setDescription('Shows all AFK users in this server'),
  cooldown: 5,
  aliases: ['afks'],
  prefix: true,
  async execute(interaction) {
      try {
            if (!interaction.guild) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('This command can only be used in a server.').setColor(config.embedColors.error)] });
            }

            const afkUsers = interaction.client.afkUsers || new Map();
            const guildAfk = [];

            afkUsers.forEach((data, userId) => {
              if (data.guildId === interaction.guild.id) {
                const timeAgo = formatDuration(Date.now() - data.since);
                guildAfk.push({ userId, reason: data.reason, timeAgo });
              }
            });

            if (guildAfk.length === 0) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('No one is currently AFK.').setColor(config.embedColors.warning)] });
            }

            const embed = new EmbedBuilder()
              .setTitle('AFK Users')
              .setColor(config.embedColors.info)
              .setTimestamp();

            guildAfk.forEach(({ userId, reason, timeAgo }) => {
              embed.addFields({
                name: `<@${userId}>`,
                value: `Reason: ${reason}\nAFK for: ${timeAgo}`,
                inline: true
              });
            });

            embed.setFooter({ text: `${guildAfk.length} user(s) AFK` });
            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
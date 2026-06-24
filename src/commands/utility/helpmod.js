const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed, createEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('helpmod')
    .setDescription('Shows all moderation commands'),
  cooldown: 5,
  aliases: ['hm'],
  prefix: true,
  async execute(interaction) {
      try {
            const embed = new EmbedBuilder()
              .setTitle('Moderation Commands')
              .setColor(config.embedColors.info)
              .setDescription('Commands available to moderators with appropriate permissions.');

            const modCmds = ['ban', 'unban', 'kick', 'mute', 'unmute', 'timeout', 'warn', 'warnings', 'clearwarnings', 'purge', 'lock', 'unlock', 'slowmode', 'nick', 'role'];
            const found = modCmds.filter(c => interaction.client.commands.has(c));
            if (found.length > 0) {
              embed.addFields({ name: 'Commands', value: found.map(c => `\`${c}\``).join(', ') });
            } else {
              embed.addFields({ name: 'Commands', value: 'No moderation commands loaded.' });
            }
            embed.setFooter({ text: 'Use /helpmod <command> for details.' });
            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
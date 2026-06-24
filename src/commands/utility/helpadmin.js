const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed, createEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('helpadmin')
    .setDescription('Shows all admin commands'),
  cooldown: 5,
  aliases: ['ha'],
  prefix: true,
  async execute(interaction) {
      try {
            const embed = new EmbedBuilder()
              .setTitle('Admin Commands')
              .setColor(config.embedColors.info)
              .setDescription('Commands available to server administrators.');

            const adminCmds = ['setprefix', 'setwelcome', 'setlog', 'setrole', 'autorole', 'antispam', 'automod', 'blacklist', 'whitelist', 'config', 'resetconfig'];
            const found = adminCmds.filter(c => interaction.client.commands.has(c));
            if (found.length > 0) {
              embed.addFields({ name: 'Commands', value: found.map(c => `\`${c}\``).join(', ') });
            } else {
              embed.addFields({ name: 'Commands', value: 'No admin commands loaded.' });
            }
            embed.setFooter({ text: 'Use /helpadmin <command> for details.' });
            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
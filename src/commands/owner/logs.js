const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('View recent bot logs')
    .addIntegerOption(opt => opt.setName('lines').setDescription('Number of lines to show').setRequired(false)),
  cooldown: 0,
  aliases: [],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    if (user.id !== config.ownerId) {
      return interaction.reply({ embeds: [errorEmbed('Only the bot owner can use this command.')] });
    }

    const lines = interaction.options?.getInteger('lines') || (args[0] ? parseInt(args[0]) : 20);

    try {
      const logPath = path.join(__dirname, '..', '..', 'logs', 'bot.log');
      if (!fs.existsSync(logPath)) {
        return interaction.reply({ embeds: [infoEmbed('No log file found.')] });
      }

      const content = fs.readFileSync(logPath, 'utf8');
      const logLines = content.split('\n').filter(l => l.trim());
      const recent = logLines.slice(-lines).join('\n');

      if (recent.length > 1900) {
        const chunks = recent.match(/.{1,1900}/gs);
        for (const chunk of chunks) {
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(config.embedColors.info || '#3498DB').setDescription(`\`\`\`\n${chunk}\n\`\`\``)] });
        }
      } else {
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(config.embedColors.info || '#3498DB').setTitle(`Last ${lines} lines`).setDescription(`\`\`\`\n${recent || 'No logs'}\n\`\`\``)] });
      }
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to read logs.')] });
    }
  }
};

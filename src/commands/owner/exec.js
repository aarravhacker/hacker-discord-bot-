const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { exec } = require('child_process');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('exec')
    .setDescription('Execute a shell command')
    .addStringOption(opt => opt.setName('command').setDescription('Command to execute').setRequired(true)),
  cooldown: 0,
  aliases: ['execute'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const user = isSlash ? interaction.user : interaction.author;
            if (user.id !== config.ownerId) {
              return interaction.reply({ embeds: [errorEmbed('Only the bot owner can use this command.')] });
            }

            const command = isSlash ? interaction.options?.getString('command') : args.join(' ');
            if (!command) {
              return interaction.reply({ embeds: [errorEmbed('Please provide a command to execute.')] });
            }

            if (isSlash) await interaction.deferReply();

            exec(command, { timeout: 30000 }, async (error, stdout, stderr) => {
              let output = stdout || '';
              if (stderr) output += `\nSTDERR:\n${stderr}`;
              if (error) output += `\nERROR:\n${error.message}`;
              if (output.length > 1900) output = output.slice(0, 1900) + '...';

              const resultEmbed = new EmbedBuilder()
                .setColor(config.embedColors.info || '#3498DB')
                .setTitle('Command Output')
                .setDescription(`\`\`\`\n${output || 'No output'}\n\`\`\``)
                .setTimestamp();

              if (isSlash) {
                await interaction.editReply({ embeds: [resultEmbed] });
              } else {
                await interaction.reply({ embeds: [resultEmbed] });
              }
            });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setprefix')
    .setDescription('Set the bot prefix for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => opt.setName('prefix').setDescription('New prefix').setRequired(true).setMaxLength(5)),
  cooldown: 5,
  aliases: ['changeprefix', 'prefixset'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
      try {
            const prefix = interaction.options?.getString('prefix') || args?.[0];
            if (!prefix) return interaction.reply({ embeds: [errorEmbed('Please provide a prefix.')] });

            if (prefix.length > 5) return interaction.reply({ embeds: [errorEmbed('Prefix must be 5 characters or less.')] });

            await updateGuild(interaction.guild.id, { prefix });

            await interaction.reply({
              embeds: [successEmbed(`Prefix changed to \`${prefix}\`\nExample: \`${prefix}help\``)]
            });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { getGuild, updateGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('disable')
    .setDescription('Disable a command in this server')
    .addStringOption(opt => opt.setName('command').setDescription('Command name to disable').setRequired(true)),
  cooldown: 0,
  aliases: [],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    if (user.id !== config.ownerId && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ embeds: [errorEmbed('You need Administrator permission to use this command.')] });
    }

    const commandName = interaction.options?.getString('command') || args[0];
    if (!commandName) {
      return interaction.reply({ embeds: [errorEmbed('Please provide a command name to disable.')] });
    }

    try {
      const guild = await getGuild(interaction.guild.id);
      const disabled = guild.disabled_commands || [];
      if (disabled.includes(commandName)) {
        return interaction.reply({ embeds: [errorEmbed(`Command **${commandName}** is already disabled.`)] });
      }

      disabled.push(commandName);
      await updateGuild(interaction.guild.id, { disabled_commands: disabled });
      await interaction.reply({ embeds: [successEmbed(`Disabled command: **${commandName}**`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to disable command.')] });
    }
  }
};

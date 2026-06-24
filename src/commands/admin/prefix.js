const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, infoEmbed, errorEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('View or change the bot prefix')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => opt.setName('prefix').setDescription('New prefix (leave empty to view)')),
  cooldown: 3,
  aliases: ['getprefix', 'showprefix'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
      try {
            const prefix = interaction.options?.getString('prefix') || args?.[0];

            if (prefix) {
              if (prefix.length > 5) return interaction.reply({ embeds: [errorEmbed('Prefix must be 5 characters or less.')] });
              await updateGuild(interaction.guild.id, { prefix });
              return interaction.reply({ embeds: [successEmbed(`Prefix changed to \`${prefix}\``)] });
            }

            const guildData = await getGuild(interaction.guild.id);
            return interaction.reply({
              embeds: [infoEmbed(`Current prefix: \`${guildData.prefix || '!'}\`\nUse \`/prefix prefix:new\` to change it.`)]
            });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
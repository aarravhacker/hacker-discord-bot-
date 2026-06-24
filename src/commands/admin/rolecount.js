const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { infoEmbed, formatNumber, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolecount')
    .setDescription('View role count statistics')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['rcountall', 'roles'],
  prefix: true,
  adminOnly: true,
  async execute(interaction) {
      try {
            const guild = interaction.guild;
            const roles = guild.roles.cache.filter(r => r.id !== guild.id);
            const totalRoles = roles.size;

            const emptyRoles = roles.filter(r => r.members.size === 0);
            const mostUsed = roles.sort((a, b) => b.members.size - a.members.size).first(5);
            const colorRoles = roles.filter(r => r.hexColor !== '#000000');
            const hoistedRoles = roles.filter(r => r.hoist);

            const embed = infoEmbed(`**${guild.name} Role Statistics**`)
              .addFields(
                { name: 'Total Roles', value: formatNumber(totalRoles), inline: true },
                { name: 'Empty Roles', value: formatNumber(emptyRoles.size), inline: true },
                { name: 'Color Roles', value: formatNumber(colorRoles.size), inline: true },
                { name: 'Hoisted Roles', value: formatNumber(hoistedRoles.size), inline: true },
                {
                  name: 'Most Used Roles',
                  value: mostUsed.map(r => `**${r.name}**: ${formatNumber(r.members.size)} members`).join('\n') || 'None',
                  inline: false
                }
              );

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
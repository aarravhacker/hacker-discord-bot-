const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Shows information about a role')
    .addRoleOption(opt => opt.setName('role').setDescription('Role to get info about').setRequired(false)),
  cooldown: 5,
  aliases: ['ri'],
  prefix: true,
  async execute(interaction) {
      try {
            if (!interaction.guild) return interaction.reply({ embeds: [new EmbedBuilder().setDescription('This command can only be used in a server.').setColor(config.embedColors.error)] });

            const role = interaction.options?.getRole('role') || interaction.member.roles.highest;
            const members = interaction.guild.members.cache.filter(m => m.roles.cache.has(role.id));

            const embed = new EmbedBuilder()
              .setTitle(role.name)
              .setColor(role.color || config.embedColors.info)
              .addFields(
                { name: 'ID', value: role.id, inline: true },
                { name: 'Color', value: role.hexColor || '#000000', inline: true },
                { name: 'Position', value: `${role.position}`, inline: true },
                { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
                { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
                { name: 'Members', value: `${members.size}`, inline: true },
                { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Permissions', value: role.permissions.toArray().join(', ').substring(0, 1024) || 'None' }
              )
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
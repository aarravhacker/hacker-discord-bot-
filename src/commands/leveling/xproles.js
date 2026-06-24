const { SlashCommandBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xproles')
    .setDescription('List all XP reward roles'),
  cooldown: 5,
  aliases: ['xproles'],
  prefix: true,
  async execute(interaction, args) {
    const guildId = interaction.guild?.id;

    try {
      const guild = await getGuild(guildId);
      const xpRoles = guild.xp_roles || {};

      if (Object.keys(xpRoles).length === 0) {
        return interaction.reply({ embeds: [errorEmbed('No XP roles configured.')] });
      }

      let description = '';
      const sortedLevels = Object.keys(xpRoles).sort((a, b) => parseInt(a) - parseInt(b));

      for (const level of sortedLevels) {
        const roleId = xpRoles[level];
        const role = interaction.guild?.roles?.cache?.get(roleId);
        description += `Level ${level}: ${role || `<@&${roleId}>`}\n`;
      }

      const embed = successEmbed('XP Reward Roles')
        .setDescription(description)
        .setColor(0x5865F2);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while fetching XP roles.')] });
    }
  }
};

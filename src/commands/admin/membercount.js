const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { infoEmbed, formatNumber, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('membercount')
    .setDescription('View detailed member count breakdown')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['mcount', 'members'],
  prefix: true,
  adminOnly: true,
  async execute(interaction) {
      try {
            const guild = interaction.guild;
            const members = await guild.members.fetch();

            const total = members.size;
            const bots = members.filter(m => m.user.bot).size;
            const humans = total - bots;

            const online = members.filter(m => m.presence?.status === 'online').size;
            const idle = members.filter(m => m.presence?.status === 'idle').size;
            const dnd = members.filter(m => m.presence?.status === 'dnd').size;
            const offline = members.filter(m => !m.presence || m.presence.status === 'offline').size;

            const embed = infoEmbed(`**${guild.name} Member Count**`)
              .addFields(
                { name: 'Total', value: formatNumber(total), inline: true },
                { name: 'Humans', value: formatNumber(humans), inline: true },
                { name: 'Bots', value: formatNumber(bots), inline: true },
                { name: 'Online', value: formatNumber(online), inline: true },
                { name: 'Idle', value: formatNumber(idle), inline: true },
                { name: 'Do Not Disturb', value: formatNumber(dnd), inline: true },
                { name: 'Offline', value: formatNumber(offline), inline: true }
              );

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
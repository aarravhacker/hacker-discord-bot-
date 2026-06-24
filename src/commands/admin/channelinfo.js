const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { infoEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Get information about a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to inspect')),
  cooldown: 3,
  aliases: ['chinfo', 'cinfo'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
      try {
            const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]) || interaction.channel;
            if (!channel) return interaction.reply({ embeds: [errorEmbed('Channel not found.')] });

            const typeMap = {
              0: 'Text', 2: 'Voice', 4: 'Category', 5: 'Announcement',
              13: 'Stage', 15: 'Forum'
            };

            const overwrites = channel.permissionOverwrites.cache.map(o => {
              const target = interaction.guild.roles.cache.get(o.id) || interaction.guild.members.cache.get(o.id);
              return `**${target?.name || 'Unknown'}**: ${[...o.allow.toArray(), ...o.deny.toArray()].join(', ') || 'None'}`;
            }).slice(0, 10);

            const embed = infoEmbed(`**Channel Info: ${channel.name}**`)
              .addFields(
                { name: 'Type', value: typeMap[channel.type] || 'Unknown', inline: true },
                { name: 'ID', value: channel.id, inline: true },
                { name: 'Created', value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Topic', value: channel.topic || 'No topic set', inline: false },
                { name: 'NSFW', value: channel.nsfw ? 'Yes' : 'No', inline: true },
                { name: 'Slowmode', value: `${channel.rateLimitPerUser}s`, inline: true },
                { name: 'Category', value: channel.parent?.name || 'None', inline: true }
              );

            if (overwrites.length) {
              embed.addFields({ name: 'Permission Overwrites (first 10)', value: overwrites.join('\n'), inline: false });
            }

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
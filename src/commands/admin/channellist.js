const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { infoEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channellist')
    .setDescription('List all channels in the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['channels', 'listchannels', 'chlist'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
      try {
            const typeMap = {
              0: '📝', 2: '🔊', 4: '📂', 5: '📢', 13: '🎭', 15: '💬'
            };

            const categories = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).sort((a, b) => a.position - b.position);

            if (!categories.size) {
              const channels = interaction.guild.channels.cache.filter(c => c.type !== ChannelType.GuildCategory);
              const list = channels.map(c => `${typeMap[c.type] || '❓'} ${c.name}`).join('\n');
              return interaction.reply({ embeds: [infoEmbed(list || 'No channels found.')] });
            }

            let desc = '';
            for (const [, cat] of categories) {
              const channels = interaction.guild.channels.cache.filter(c => c.parentId === cat.id).sort((a, b) => a.position - b.position);
              desc += `**${cat.name}** (${channels.size})\n`;
              desc += channels.map(c => `  ${typeMap[c.type] || '❓'} ${c.name}`).join('\n') + '\n\n';
            }

            const uncategorized = interaction.guild.channels.cache.filter(c => !c.parent && c.type !== ChannelType.GuildCategory);
            if (uncategorized.size) {
              desc += `**Uncategorized**\n${uncategorized.map(c => `  ${typeMap[c.type] || '❓'} ${c.name}`).join('\n')}`;
            }

            return interaction.reply({ embeds: [infoEmbed(desc.slice(0, 4000) || 'No channels found.')] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { infoEmbed, formatNumber, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverstats')
    .setDescription('View server statistics')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['guildstats', 'sstats', 'server'],
  prefix: true,
  adminOnly: true,
  async execute(interaction) {
      try {
            const guild = interaction.guild;
            const totalMembers = guild.memberCount;
            const bots = guild.members.cache.filter(m => m.user.bot).size;
            const humans = totalMembers - bots;
            const online = guild.members.cache.filter(m => m.presence?.status === 'online' || m.presence?.status === 'idle' || m.presence?.status === 'dnd').size;

            const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
            const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
            const categories = guild.channels.cache.filter(c => c.type === 4).size;
            const roles = guild.roles.cache.size - 1;

            const boosts = guild.premiumSubscriptionCount || 0;
            const boostLevel = guild.premiumTier;

            const emojis = guild.emojis.cache.size;
            const staticEmojis = guild.emojis.cache.filter(e => !e.animated).size;
            const animatedEmojis = emojis - staticEmojis;

            const embed = infoEmbed(`**${guild.name} Statistics**`)
              .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
              .addFields(
                { name: 'Members', value: [
                  `Total: ${formatNumber(totalMembers)}`,
                  `Humans: ${formatNumber(humans)}`,
                  `Bots: ${formatNumber(bots)}`,
                  `Online: ${formatNumber(online)}`
                ].join('\n'), inline: true },
                { name: 'Channels', value: [
                  `Text: ${textChannels}`,
                  `Voice: ${voiceChannels}`,
                  `Categories: ${categories}`
                ].join('\n'), inline: true },
                { name: 'Roles', value: `${roles}`, inline: true },
                { name: 'Boosts', value: [
                  `Count: ${boosts}`,
                  `Level: ${boostLevel}`
                ].join('\n'), inline: true },
                { name: 'Emojis', value: [
                  `Total: ${emojis}`,
                  `Static: ${staticEmojis}`,
                  `Animated: ${animatedEmojis}`
                ].join('\n'), inline: true },
                { name: 'Server', value: [
                  `Created: <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
                  `Owner: ${await guild.fetchOwner().then(m => m.user.tag).catch(() => 'Unknown')}`,
                  `ID: ${guild.id}`
                ].join('\n'), inline: true }
              );

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { formatNumber, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Shows information about this server'),
  cooldown: 5,
  aliases: ['si', 'guild'],
  prefix: true,
  async execute(interaction) {
      try {
            const guild = interaction.guild;
            if (!guild) return interaction.reply({ embeds: [new EmbedBuilder().setDescription('This command can only be used in a server.').setColor(config.embedColors.error)] });

            const roles = guild.roles.cache.size;
            const emojis = guild.emojis.cache.size;
            const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
            const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
            const onlineMembers = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;

            const embed = new EmbedBuilder()
              .setTitle(guild.name)
              .setThumbnail(guild.iconURL({ dynamic: true }))
              .setColor(config.embedColors.info)
              .addFields(
                { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Members', value: formatNumber(guild.memberCount), inline: true },
                { name: 'Online', value: formatNumber(onlineMembers), inline: true },
                { name: 'Roles', value: formatNumber(roles), inline: true },
                { name: 'Emojis', value: formatNumber(emojis), inline: true },
                { name: 'Text Channels', value: formatNumber(textChannels), inline: true },
                { name: 'Voice Channels', value: formatNumber(voiceChannels), inline: true },
                { name: 'Boost Level', value: `Tier ${guild.premiumTier}`, inline: true },
                { name: 'Boosts', value: formatNumber(guild.premiumSubscriptionCount || 0), inline: true },
                { name: 'Verification Level', value: guild.verificationLevel.toString(), inline: true },
                { name: 'Splash', value: guild.splashURL() ? 'Yes' : 'No', inline: true }
              )
              .setTimestamp();

            if (guild.bannerURL()) embed.setImage(guild.bannerURL());
            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
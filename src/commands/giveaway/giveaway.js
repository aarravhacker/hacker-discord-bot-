const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const config = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start a giveaway')
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel for giveaway').setRequired(true))
    .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true))
    .addStringOption(opt => opt.setName('prize').setDescription('Prize').setRequired(true))
    .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 10,
  aliases: ['gstart', 'gcreate'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args[0]);
      const duration = interaction.options?.getInteger('duration') || parseInt(args[1]);
      const prize = interaction.options?.getString('prize') || args.slice(2).join(' ');
      const winners = interaction.options?.getInteger('winners') || 1;

      if (!channel || !duration || !prize) {
        return interaction.reply({ embeds: [errorEmbed('Usage: /giveaway <channel> <duration> <prize> [winners]')] });
      }

      const endTime = Date.now() + duration * 60000;
      const embed = new EmbedBuilder()
        .setColor(config.embedColors.giveaway || '#FFD700')
        .setTitle('🎉 GIVEAWAY 🎉')
        .setDescription(`**Prize:** ${prize}\n**Hosted by:** ${user}\n**Ends:** <t:${Math.floor(endTime / 1000)}:R>\n**Winners:** ${winners}`)
        .setFooter({ text: 'React with 🎉 to enter!' })
        .setTimestamp();

      const msg = await channel.send({ embeds: [embed] });
      await msg.react('🎉');

      const db = getDB();
      await db('giveaways').insert({
        message_id: msg.id,
        channel_id: channel.id,
        guild_id: interaction.guild.id,
        host_id: user.id,
        prize: prize,
        winners: winners,
        end_time: new Date(endTime),
        ended: false
      });

      await interaction.reply({ embeds: [successEmbed(`Giveaway started in ${channel}! Prize: **${prize}**`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to start giveaway.')] });
    }
  }
};

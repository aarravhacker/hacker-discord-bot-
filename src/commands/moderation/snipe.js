const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

const snipeCache = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('Show last deleted message')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  cooldown: 5,
  aliases: ['snipemessage', 'lastdeleted'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    try {
      const channel = interaction.channel;

      const snipedMessage = snipeCache.get(channel.id);

      if (!snipedMessage) {
        return interaction.reply({
          embeds: [infoEmbed('No deleted messages found in this channel.')],
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('Sniped Message')
        .setAuthor({
          name: snipedMessage.author.tag,
          iconURL: snipedMessage.author.displayAvatarURL()
        })
        .setDescription(snipedMessage.content || '*No content*')
        .setTimestamp(snipedMessage.deletedAt)
        .setFooter({ text: `Channel: ${channel.name}` });

      if (snipedMessage.attachments.size > 0) {
        const attachments = snipedMessage.attachments.map(att => att.url).join('\n');
        embed.addFields({ name: 'Attachments', value: attachments });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in snipe command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while sniping the message.')],
        ephemeral: true
      });
    }
  }
};

module.exports.snipeCache = snipeCache;
